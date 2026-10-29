// Hosting-terminal maintenance only. No web endpoint; never run automatically on deployment.
import { Pool } from 'pg';
import { open, readFile } from 'node:fs/promises';
import { isAbsolute } from 'node:path';
import { RESET_TABLES, resetSetting, fingerprint, clearedRecords, validateSnapshot } from './reset-equipment-model.mjs';

const [action, path, confirmation, ...extra] = process.argv.slice(2);
const confirmations = { apply: 'CLEAR EQUIPMENT ACTIVITY', rollback: 'RESTORE EQUIPMENT ACTIVITY' };
if (!['prepare', 'apply', 'rollback'].includes(action) || !path || !isAbsolute(path) || extra.length ||
    (action === 'prepare' ? confirmation !== undefined : confirmation !== confirmations[action])) {
  console.error('Usage: node /app/scripts/reset-equipment.mjs prepare /absolute/path/backup.json');
  console.error('       node /app/scripts/reset-equipment.mjs apply /absolute/path/backup.json "CLEAR EQUIPMENT ACTIVITY"');
  console.error('       node /app/scripts/reset-equipment.mjs rollback /absolute/path/backup.json "RESTORE EQUIPMENT ACTIVITY"');
  process.exit(1);
}
if (!process.env.DATABASE_URL) { console.error('DATABASE_URL is required. Use the application container terminal.'); process.exit(1); }
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
let client;
let completion;
try {
  client = await pool.connect();
  await client.query('BEGIN');
  await client.query("SET LOCAL lock_timeout = '10s'");
  await client.query("SET LOCAL statement_timeout = '120s'");
  // Block concurrent writes while comparing the snapshot and applying the transaction.
  await client.query(`LOCK TABLE ${RESET_TABLES.join(', ')} IN EXCLUSIVE MODE`);
  const { rows: [database] } = await client.query('SELECT current_database() AS name, oid::text AS oid FROM pg_database WHERE datname = current_database()');
  const records = {};
  for (const table of RESET_TABLES) {
    if (table === 'document_objects') {
      records[table] = (await client.query("SELECT key, encode(data, 'base64') AS base64, content_type, uploaded_at::text AS uploaded_at FROM document_objects WHERE key LIKE 'evidence/%' ORDER BY key")).rows;
    } else {
      const rows = (await client.query(`SELECT * FROM ${table} ORDER BY id`)).rows;
      records[table] = table === 'settings' ? rows.filter(row => resetSetting(row.id)) : rows;
    }
  }
  if (action === 'prepare') {
    const createdAt = new Date().toISOString();
    const snapshot = { format: 'dental-stars-equipment-reset', version: 1, createdAt, database, records,
      before: fingerprint(records), after: fingerprint(clearedRecords(records, createdAt)) };
    validateSnapshot(snapshot);
    const file = await open(path, 'wx', 0o600);
    try { await file.writeFile(JSON.stringify(snapshot)); await file.sync(); } finally { await file.close(); }
    validateSnapshot(JSON.parse(await readFile(path, 'utf8')));
    console.log('Backup written and checksum verified. NO database records changed.');
    console.log(JSON.stringify({ equipmentRetained: records.assets.length,
      assignmentsCleared: records.assets.filter(row => { const a = JSON.parse(row.data); return a.status === 'Assigned' || a.assignee || a.staffId; }).length,
      activityRemoved: records.history.length, inventoryChecksRemoved: records.audits.length,
      checkResultsRemoved: records.audit_checks.length,
      receiptsRemoved: records.settings.filter(row => row.id === 'receipt-register').reduce((n, row) => n + JSON.parse(row.data).length, 0),
      documentsRemoved: records.document_objects.length,
      equipmentReportsRemoved: records.settings.filter(row => row.id.startsWith('staff-request:')).length,
      usersStaffRoles: 'untouched', checksum: snapshot.before }, null, 2));
    console.log('Copy this backup OUTSIDE the container before applying. Keep a hosting-level database backup too.');
  } else {
    const snapshot = validateSnapshot(JSON.parse(await readFile(path, 'utf8')));
    if (JSON.stringify(database) !== JSON.stringify(snapshot.database)) throw Error('Backup belongs to another database.');
    const expected = action === 'apply' ? snapshot.before : snapshot.after;
    if (fingerprint(records) !== expected) throw Error('Affected data changed since the snapshot/reset. No changes applied. Prepare a fresh backup or arrange a reviewed recovery.');
    const replacement = action === 'apply' ? clearedRecords(snapshot.records, snapshot.createdAt) : snapshot.records;
    // Only explicitly scoped rows are deleted. Staff, authentication and all access settings are never written.
    await client.query('DELETE FROM audit_checks');
    await client.query('DELETE FROM audits');
    await client.query('DELETE FROM history');
    for (const row of records.settings) await client.query('DELETE FROM settings WHERE id = $1', [row.id]);
    await client.query("DELETE FROM document_objects WHERE key LIKE 'evidence/%'");
    for (const row of replacement.assets) await client.query('UPDATE assets SET data = $2 WHERE id = $1', [row.id, row.data]);
    for (const table of ['history', 'audits', 'audit_checks', 'settings']) {
      const columns = { history: ['id', 'asset_id', 'data', 'date'], audits: ['id', 'data', 'date'],
        audit_checks: ['id', 'audit_id', 'data'], settings: ['id', 'data'] }[table];
      for (const row of replacement[table]) {
        await client.query(`INSERT INTO ${table} (${columns.join(',')}) VALUES (${columns.map((_, i) => '$' + (i + 1)).join(',')})`, columns.map(key => row[key]));
      }
    }
    for (const row of replacement.document_objects) {
      await client.query('INSERT INTO document_objects (key, data, content_type, uploaded_at) VALUES ($1, $2, $3, $4)',
        [row.key, Buffer.from(row.base64, 'base64'), row.content_type, row.uploaded_at]);
    }
    completion = action === 'apply' ? 'Reset complete. Equipment retained; users, staff and roles untouched.' : 'Equipment activity restored. Users, staff and roles untouched.';
  }
  await client.query('COMMIT');
  if (completion) console.log(completion);
} catch (error) {
  if (client) await client.query('ROLLBACK').catch(() => {});
  // Do not print raw database errors, connection strings, document content or credentials.
  const safeMessages = ['Invalid reset backup.', 'Backup contains data outside the reset scope.', 'Backup checksum mismatch.',
    'Backup belongs to another database.', 'Affected data changed since the snapshot/reset. No changes applied. Prepare a fresh backup or arrange a reviewed recovery.'];
  if (safeMessages.includes(error?.message)) console.error(error.message);
  if (['EEXIST', 'ENOENT', 'ENOSPC', 'EACCES'].includes(error?.code)) console.error('Backup file error: ' + error.code);
  console.error('Operation did not confirm success; rollback attempted. Check backup, connectivity and disk space. If connection failed during commit, inspect the data before retrying. No credentials printed.');
  process.exitCode = 1;
} finally {
  client?.release();
  await pool.end();
}
