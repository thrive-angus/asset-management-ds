export type StorageEnv = { BUCKET?: R2Bucket };

// Cloudflare bindings do not exist in a conventional Node deployment. Resolve
// them only after authorization so route imports cannot bypass the auth response.
export async function storageEnv(): Promise<StorageEnv> {
  try {
    const workers = await import('cloudflare:workers');
    return { BUCKET: workers.env?.BUCKET };
  } catch {
    return {};
  }
}
