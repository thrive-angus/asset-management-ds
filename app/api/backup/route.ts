import { validateBackup, protectedBackupSetting, BACKUP_TABLES } from '../../backup-model';
import { getDb } from '../../../db';
import { assets, staff, history, audits, auditChecks, settings } from '../../../db/schema';
import { requireAccess, apiError } from '../../permissions';

const tables = { assets, staff, history, audits, auditChecks, settings };
type BackupTable = (typeof BACKUP_TABLES)[number];
type BackupRow = {
  id: string;
  data: string;
  assetId?: string;
  date?: string;
  auditId?: string;
};
type BackupFile = { key: string; type: string; base64: string };

function encode(bytes: Uint8Array) {
  let out = '';
  for (let i = 0; i < bytes.length; i += 32768) {
    out += String.fromCharCode(...bytes.subarray(i, i + 32768));
  }
  return btoa(out);
}

function decode(base64: string) {
  return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
}

type RestoreMode = 'missing' | 'full';

function restoreMode(value: unknown): RestoreMode {
  return value === 'full' ? 'full' : 'missing';
}

async function getBucket() {
  try {
    const workers = await import('cloudflare:workers');
    return workers.env?.BUCKET;
  } catch {
    return undefined;
  }
}

export async function GET(req?: Request) {
  try {
    const user = await requireAccess('admin');
    const query = req ? new URL(req.url).searchParams : null;
    const bucket = await getBucket();

    if (query?.get('mode') === 'list') {
      if (!bucket) throw Error('Backup storage unavailable.');
      const result = await bucket.list({ prefix: 'backups/', limit: 1000 });
      return Response.json({
        items: result.objects
          .map(o => ({ key: o.key, size: o.size, date: o.uploaded.toISOString() }))
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, 30),
      });
    }

    if (query?.get('key')) {
      const key = query.get('key')!;
      if (!/^backups\/[0-9TZ._a-f-]+\.json$/.test(key)) {
        return Response.json({ error: 'Invalid backup reference.' }, { status: 400 });
      }
      const object = await bucket?.get(key);
      if (!object) return Response.json({ error: 'Saved backup unavailable.' }, { status: 404 });
      return new Response(object.body, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': 'attachment; filename="Dental-Stars-Saved-Backup.json"',
          'Cache-Control': 'no-store',
        },
      });
    }

    const db = getDb();
    const records: Record<BackupTable, BackupRow[]> = {
      assets: [],
      staff: [],
      history: [],
      audits: [],
      auditChecks: [],
      settings: [],
    };
    for (const key of BACKUP_TABLES) {
      const table = tables[key] as never;
      records[key] = (await db.select().from(table)) as BackupRow[];
    }

    const keys = new Set<string>();
    for (const r of records.assets) {
      const a = JSON.parse(r.data);
      for (const e of a.evidence || []) keys.add(e.key);
    }
    for (const r of records.settings) {
      if (r.id === 'receipt-register') {
        for (const receipt of JSON.parse(r.data)) {
          for (const attachment of receipt.attachments || []) keys.add(attachment.key);
        }
      }
    }
    for (const r of records.history) {
      const e = JSON.parse(r.data);
      for (const a of [e.before, e.after]) {
        for (const item of a?.evidence || []) keys.add(item.key);
        for (const item of a?.attachments || []) keys.add(item.key);
      }
      if (e.action === 'Evidence attached' && e.details?.key) keys.add(e.details.key);
    }

    const files: BackupFile[] = [];
    let total = 0;
    for (const key of keys) {
      const object = await bucket?.get(key);
      if (!object) {
        throw Error('Backup incomplete: an evidence file is unavailable. Contact the administrator.');
      }
      total += object.size;
      if (total > 20 * 1024 * 1024) {
        throw Error('Evidence exceeds the 20 MB in-app backup limit. Export the storage bucket and database through your hosting administrator.');
      }
      files.push({
        key,
        type: object.httpMetadata?.contentType || 'application/octet-stream',
        base64: encode(new Uint8Array(await object.arrayBuffer())),
      });
    }

    const backup = {
      format: 'dental-stars-backup',
      version: 1,
      createdAt: new Date().toISOString(),
      createdBy: user.displayName,
      records,
      files,
    };
    const serialized = JSON.stringify(backup);
    if (!bucket) throw Error('Backup storage unavailable.');
    await bucket.put(
      'backups/' + backup.createdAt.replaceAll(':', '-') + '_' + crypto.randomUUID() + '.json',
      serialized,
      { httpMetadata: { contentType: 'application/json' } },
    );
    return new Response(serialized, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="Dental-Stars-Backup-' + new Date().toISOString().slice(0, 10) + '.json"',
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    return apiError(e);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAccess('admin');
    const bucket = await getBucket();
    if (Number(req.headers.get('content-length') || 0) > 32 * 1024 * 1024) {
      return Response.json({ error: 'Backup must be under 32 MB.' }, { status: 413 });
    }

    const text = await req.text();
    if (text.length > 32 * 1024 * 1024) {
      return Response.json({ error: 'Backup must be under 32 MB.' }, { status: 413 });
    }

    const input = JSON.parse(text) as {
      backup: unknown;
      mode?: unknown;
      action?: unknown;
      confirm?: unknown;
      phrase?: unknown;
    };
    const b = validateBackup(input.backup);
    const mode = restoreMode(input.mode);
    const db = getDb();
    const summary: Record<string, { import: number; replaced: number; skipped: number }> = {};
    const inserts: Array<{ key: BackupTable; row: BackupRow }> = [];

    for (const key of BACKUP_TABLES) {
      const table = tables[key] as never;
      const existingRows = (await db.select().from(table)) as BackupRow[];
      const existing = new Set(existingRows.map(r => r.id));
      const rows = mode === 'full'
        ? b.records[key]
        : b.records[key].filter(
            (r: BackupRow) =>
              !existing.has(r.id) &&
              (key !== 'settings' || !protectedBackupSetting(r.id)),
          );
      summary[key] = {
        import: rows.length,
        replaced: mode === 'full' ? existingRows.length : 0,
        skipped: mode === 'full' ? 0 : b.records[key].length - rows.length,
      };
      for (const row of rows) inserts.push({ key, row });
    }

    if (input.action === 'preview') {
      return Response.json({ summary, files: b.files.length, mode });
    }

    if (input.action !== 'restore' || input.confirm !== true) {
      return Response.json({ error: 'Preview and confirm the backup import.' }, { status: 400 });
    }

    if (mode === 'full' && input.phrase !== 'RESTORE EVERYTHING') {
      return Response.json(
        { error: 'Type RESTORE EVERYTHING to confirm replacing all existing records.' },
        { status: 400 },
      );
    }

    for (const f of b.files) {
      if (!bucket) throw Error('Evidence storage unavailable.');
      if (mode === 'full') {
        await bucket.put(f.key, decode(f.base64), {
          httpMetadata: { contentType: f.type },
        });
      } else if (!(await bucket.head(f.key))) {
        await bucket.put(f.key, decode(f.base64), {
          httpMetadata: { contentType: f.type },
        });
      }
    }

    await db.transaction(async tx => {
      if (mode === 'full') {
        await tx.delete(auditChecks);
        await tx.delete(audits);
        await tx.delete(history);
        await tx.delete(assets);
        await tx.delete(staff);
        await tx.delete(settings);
      }
      for (const item of inserts) {
        const table = tables[item.key] as never;
        await tx.insert(table).values(item.row as never).onConflictDoNothing();
      }
      const date = new Date().toISOString();
      const event = {
        id: crypto.randomUUID(),
        assetId: 'Backup Restore',
        date,
        action: mode === 'full' ? 'Complete backup restored' : 'Backup imported',
        recordedBy: { id: user.userId, name: user.displayName, email: user.email },
        details: summary,
      };
      await tx.insert(history).values({
        id: event.id,
        assetId: event.assetId,
        date,
        data: JSON.stringify(event),
      });
    });

    return Response.json({ ok: true, summary, mode });
  } catch (e) {
    return apiError(e);
  }
}
