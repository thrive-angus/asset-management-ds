import type {DocumentBucket} from './postgres-storage';
export type StorageEnv = { BUCKET?: DocumentBucket | R2Bucket };

// Cloudflare bindings do not exist in a conventional Node deployment. Resolve
// them only after authorization so route imports cannot bypass the auth response.
export async function storageEnv(): Promise<StorageEnv> {
  if (process.env.DATABASE_URL) {
    const [{getPgPool},{postgresBucket}] = await Promise.all([import('../db'),import('./postgres-storage')]);
    return {BUCKET:postgresBucket(getPgPool())};
  }
  try {
    const workers = await import('cloudflare:workers');
    return { BUCKET: workers.env?.BUCKET };
  } catch {
    return {};
  }
}
