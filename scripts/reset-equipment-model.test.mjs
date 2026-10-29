import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RESET_TABLES, resetSetting, clearedRecords, fingerprint, validateSnapshot } from './reset-equipment-model.mjs';

const date = '2026-10-29T04:00:00.000Z';
function fixture() {
  return { assets: [{ id: 'LAP-1', data: JSON.stringify({ id: 'LAP-1', model: 'Lenovo', serial: '123',
    category: 'Laptop', condition: 'Good', status: 'Assigned', staffId: 'person-1', assignee: 'user@example.com',
    purchaseCost: 100, notes: 'Keep asset notes', receiptReference: 'REC-1', topUpReceiptReference: 'REC-2',
    receipt: { name: 'Person' }, returnInspection: { note: 'old' }, evidence: [{ key: 'evidence/a' }],
    lastVerified: date, previousOwner: 'Person' }) }],
    history: [{ id: 'h1', asset_id: 'LAP-1', date, data: '{}' }],
    audits: [{ id: 'a1', date, data: '{}' }], audit_checks: [{ id: 'c1', audit_id: 'a1', data: '{}' }],
    settings: [{ id: 'receipt-register', data: '[{"reference":"REC-1"}]' }],
    document_objects: [{ key: 'evidence/a', base64: 'cGRm', content_type: 'application/pdf', uploaded_at: date }] };
}
test('clears assignments and operational records while preserving equipment identity and purchase data', () => {
  const records = fixture(); const original = structuredClone(records);
  const cleared = clearedRecords(records, date); const a = JSON.parse(cleared.assets[0].data);
  assert.deepEqual(records, original);
  assert.equal(a.model, 'Lenovo'); assert.equal(a.serial, '123'); assert.equal(a.purchaseCost, 100);
  assert.equal(a.notes, 'Keep asset notes'); assert.equal(a.status, 'Available');
  assert.equal(a.staffId, ''); assert.equal(a.assignee, ''); assert.deepEqual(a.evidence, []);
  for (const key of ['receipt', 'returnInspection', 'lastVerified', 'receiptReference', 'topUpReceiptReference', 'previousOwner']) assert.equal(key in a, false);
  for (const table of RESET_TABLES.filter(t => t !== 'assets')) assert.deepEqual(cleared[table], []);
});
test('preserves non-assigned equipment statuses and keeps damaged assigned equipment unavailable', () => {
  for (const status of ['Lost', 'Retired', 'Under repair', 'Returned']) {
    const records = fixture(); records.assets[0].data = JSON.stringify({ status, condition: 'Good', archived: true });
    const a = JSON.parse(clearedRecords(records, date).assets[0].data);
    assert.equal(a.status, status); assert.equal(a.archived, true);
  }
  const records = fixture(); records.assets[0].data = JSON.stringify({ status: 'Assigned', condition: 'Damaged' });
  assert.equal(JSON.parse(clearedRecords(records, date).assets[0].data).status, 'Under repair');
});
test('users, roles, staff links and account settings are outside the reset scope', () => {
  for (const id of ['access', 'personal-account:a', 'login-staff:a', 'role-request:a', 'equipment-types', 'bundles']) assert.equal(resetSetting(id), false);
  for (const id of ['receipt-register', 'staff-request:a', 'notification-read:a']) assert.equal(resetSetting(id), true);
  assert.equal(RESET_TABLES.some(t => t.startsWith('auth_') || t === 'staff'), false);
});
test('backup validates original and deterministic post-reset fingerprints; detects changed data and documents', () => {
  const records = fixture();
  const snapshot = { format: 'dental-stars-equipment-reset', version: 1, createdAt: date, database: { name: 'fixture', oid: '1' }, records,
    before: fingerprint(records), after: fingerprint(clearedRecords(records, date)) };
  assert.equal(validateSnapshot(snapshot), snapshot);
  assert.equal(validateSnapshot(JSON.parse(JSON.stringify(snapshot))).before, snapshot.before);
  const changed = structuredClone(snapshot); changed.records.document_objects[0].base64 = 'bmV3';
  assert.throws(() => validateSnapshot(changed), /checksum/);
  const access = structuredClone(snapshot); access.records.settings.push({ id: 'access', data: '{}' });
  assert.throws(() => validateSnapshot(access), /outside/);
  const backups = structuredClone(snapshot); backups.records.document_objects[0].key = 'backups/safe.json';
  assert.throws(() => validateSnapshot(backups), /outside/);
  const newActivity = clearedRecords(records, date); newActivity.history.push({ id: 'new', data: '{}' });
  assert.notEqual(fingerprint(newActivity), snapshot.after);
});
