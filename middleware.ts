import { NextResponse } from 'next/server';
import { rejectCrossOriginWrite, SECURITY_HEADERS } from './app/request-security';

export function middleware(req: Request) {
  const path = new URL(req.url).pathname;
  const isApi = path.startsWith('/api/');
  const rejected = isApi && rejectCrossOriginWrite(req, process.env.APP_ORIGIN);
  const response = rejected
    ? NextResponse.json({ error: 'Cross-origin write requests are not allowed.' }, { status: 403 })
    : NextResponse.next();
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) response.headers.set(name, value);
  if (isApi) response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export const config = { matcher: ['/:path*'] };
