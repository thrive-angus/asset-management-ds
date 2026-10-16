export function rejectCrossOriginWrite(req: Request, configuredOrigin?: string): boolean {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return false;
  const site = req.headers.get('sec-fetch-site');
  if (site === 'cross-site' || site === 'same-site') return true;
  const origin = req.headers.get('origin');
  if (!origin) return site !== 'same-origin';
  try {
    const source = new URL(origin);
    if (!['http:', 'https:'].includes(source.protocol) || source.origin !== origin) return true;
    if (configuredOrigin) return source.origin !== new URL(configuredOrigin).origin;
    // Host is preserved by Dokploy's reverse proxy; forwarded host values are not trusted.
    return source.host !== (req.headers.get('host') || new URL(req.url).host);
  } catch {
    return true;
  }
}

export const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Content-Security-Policy': "frame-ancestors 'self'; base-uri 'self'",
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(self), microphone=(), geolocation=()',
};
