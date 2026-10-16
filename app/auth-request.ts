export class AuthRequestError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

// Enforce the limit while streaming, including chunked bodies without Content-Length.
export async function readAuthRequest(req: Request): Promise<Record<string, unknown>> {
  const maxBytes = 16 * 1024;
  if (Number(req.headers.get('content-length')) > maxBytes) {
    throw new AuthRequestError('Request body is too large.', 413);
  }
  if (req.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    throw new AuthRequestError('Send an application/json request.', 415);
  }
  const reader = req.body?.getReader();
  if (!reader) throw new AuthRequestError('Enter a valid JSON request.', 400);
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new AuthRequestError('Request body is too large.', 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try {
    const input: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid object');
    return input as Record<string, unknown>;
  } catch {
    throw new AuthRequestError('Enter a valid JSON request.', 400);
  }
}
