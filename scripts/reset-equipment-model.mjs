import { createHash } from 'node:crypto';

export const RESET_TABLES = ['assets', 'history', 'audits', 'audit_checks', 'settings', 'document_objects'];
export const resetSetting = id => id === 'receipt-register' || id.startsWith('staff-request:') || id.startsWith('notification-read:');
export function fingerprint(records) {
  return createHash('sha256').update(JSON.stringify(RESET_TABLES.map(table => [table,
    [...records[table]].sort((a, b) => String(a.id ?? a.key).localeCompare(String(b.id ?? b.key))),
  ]))).digest('hex');
}
export function clearedRecords(records, date) {
  return {
    assets: records.assets.map(row => {
      const asset = JSON.parse(row.data);
      for (const key of ['receipt', 'returnInspection', 'previousOwner', 'currentAssignmentDate', 'lastReturnDate',
        'lastVerified', 'lastVerifiedBy', 'receiptReference', 'topUpReceiptReference', 'receiptEntryId',
        'topUpReceiptEntryId', 'eventDate']) delete asset[key];
      asset.assignee = '';
      asset.staffId = '';
      asset.evidence = [];
      if (asset.status === 'Assigned') asset.status = ['Damaged', 'Not working'].includes(asset.condition) ? 'Under repair' : 'Available';
      asset.updated = date;
      return { ...row, data: JSON.stringify(asset) };
    }),
    history: [], audits: [], audit_checks: [], settings: [], document_objects: [],
  };
}
export function validateSnapshot(snapshot) {
  if (snapshot?.format !== 'dental-stars-equipment-reset' || snapshot.version !== 1 ||
      !/^\d{4}-\d\d-\d\dT/.test(snapshot.createdAt) || !snapshot.database ||
      RESET_TABLES.some(table => !Array.isArray(snapshot.records?.[table]))) throw Error('Invalid reset backup.');
  if (snapshot.records.settings.some(row => !resetSetting(row.id)) ||
      snapshot.records.document_objects.some(row => !row.key.startsWith('evidence/'))) throw Error('Backup contains data outside the reset scope.');
  if (fingerprint(snapshot.records) !== snapshot.before ||
      fingerprint(clearedRecords(snapshot.records, snapshot.createdAt)) !== snapshot.after) throw Error('Backup checksum mismatch.');
  return snapshot;
}
