import { NextResponse } from "next/server";
import { authenticateByPassword, createSession, SESSION_COOKIE } from "../../../local-auth";
import { safeReturnPath } from '../../../safe-return-path';
import { reserveLoginAttempt, clearLoginAttempts, LOGIN_RETRY_SECONDS } from '../../../login-throttle';
import { readAuthRequest, AuthRequestError } from '../../../auth-request';

export async function POST(req: Request) {
  try {
    const input = await readAuthRequest(req);
    const email = String(input?.email || "").trim().toLowerCase();
    const password = String(input?.password || "");
    const returnTo = safeReturnPath(input?.returnTo);
    if (!email || !password || email.length > 254 || password.length > 1024) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    if (!await reserveLoginAttempt(email)) {
      return NextResponse.json({ error: 'Too many sign-in attempts. Try again in 15 minutes.' }, {
        status: 429, headers: { 'Retry-After': String(LOGIN_RETRY_SECONDS), 'Cache-Control': 'no-store' },
      });
    }
    const user = await authenticateByPassword(email, password);
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    await clearLoginAttempts(email);
    const token = await createSession(user.id);
    const next = user.mustResetPassword
      ? `/reset-password?return_to=${encodeURIComponent(returnTo)}`
      : returnTo;
    const res = NextResponse.json({ ok: true, next, resetRequired: user.mustResetPassword });
    res.cookies.set({
      name: SESSION_COOKIE,
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (error) {
    if (error instanceof AuthRequestError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Login failed", error instanceof Error ? error.name : 'Unknown error');
    return NextResponse.json({ error: "Unable to sign in right now." }, { status: 500 });
  }
}
