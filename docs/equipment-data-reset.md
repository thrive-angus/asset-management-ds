# One-time equipment data reset and rollback

Run these commands only in the deployed application's container terminal. They use its existing `DATABASE_URL`; do not paste credentials into chat. Deployment itself never resets data. Pause staff use while preparing/applying the reset and during any immediate rollback.

Retained unchanged: all equipment rows and IDs, equipment descriptions, serials, conditions, locations, purchase amounts, warranty/repair details, archived states, all staff records, login accounts, roles, account links, access requests, and configuration. Assigned equipment becomes Available (or Under repair if its condition is Damaged/Not working); existing Lost/Retired/Under repair statuses are preserved.

Cleared: assignees, staff assignment links, assignment acknowledgements, previous-owner and return-inspection records, verification stamps, receipt links, equipment evidence, the receipt register, staff equipment reports, notification read markers, all activity history, inventory checks/results, and uploaded evidence/receipt files. Existing saved backup files are retained deliberately for recovery. Retained operational details can still produce repair or loss follow-ups; retained access requests can still produce access notifications.

## 1. Prepare and inspect (no database writes)

Create a hosting-level PostgreSQL backup first. Then:

```sh
node /app/scripts/reset-equipment.mjs prepare /tmp/equipment-before-reset.json
```

This writes an exclusive, checksum-verified backup file and prints counts. It fails if the file already exists. It contains affected equipment records and document bytes, so treat it as confidential. It excludes passwords, login accounts and staff records because those are never changed. It is a maintenance snapshot, not an in-app backup import file.

**Download/copy the file outside the container before continuing.** Container replacement or redeployment may delete `/tmp`. In Dokploy use a file download facility if available; otherwise, on the VPS host, use `docker cp <application-container-id>:/tmp/equipment-before-reset.json /root/equipment-before-reset.json`, replacing the placeholder with the actual application container ID. Keep that external copy secure and verify it is readable JSON. Do not remove its document contents. Do not commit it to Git.

## 2. Apply in the same container

```sh
node /app/scripts/reset-equipment.mjs apply /tmp/equipment-before-reset.json "CLEAR EQUIPMENT ACTIVITY"
```

The command checks the backup, database identity and current data fingerprint, then applies everything in one locked database transaction. Concurrent changes cause refusal; prepare a new snapshot and copy it out again if necessary. Database errors roll back the transaction. Refresh the website afterward. Users, staff, sessions and roles are never updated or deleted.

## 3. Immediate rollback if required

```sh
node /app/scripts/reset-equipment.mjs rollback /tmp/equipment-before-reset.json "RESTORE EQUIPMENT ACTIVITY"
```

Rollback restores the exact affected records and document bytes from the snapshot. It requires the affected equipment/history/checks/receipts/document data still to match the reset state. New assignments, edits, reports, documents, inventory checks, or notification read changes will cause refusal to avoid silently overwriting subsequent work. Users/staff/access changes do not block this targeted rollback and are preserved. After subsequent work, arrange a reviewed recovery rather than forcing a rollback. If the original container was replaced, securely copy the saved snapshot into the replacement container first.

The checksum detects corruption and accidental edits; it is not a signature against a malicious hosting administrator. These commands require trusted database and filesystem access. Keep the backup until the reset has been accepted and recovery is no longer required.
