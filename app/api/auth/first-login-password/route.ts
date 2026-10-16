import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { authUsers } from "../../../../db/schema";
import {
  SESSION_COOKIE,
  createSession,
  destroyUserSessions,
  sessionAccount,
} from "../../../local-auth";
import { hashPassword, passwordStrengthError } from "../../../password-auth";
import { safeReturnPath } from '../../../safe-return-path';
import { readAuthRequest, AuthRequestError } from '../../../auth-request';

export async function GET(req: Request) {
  const account = await sessionAccount();
  if (!account) {
    return NextResponse.json({ error: "Sign in again to continue." }, { status: 401 });
  }
  const url = new URL(req.url);
  return NextResponse.json({
    required: account.user.mustResetPassword,
    email: account.user.email,
    returnTo: safeReturnPath(url.searchParams.get("return_to")),
  });
}

export async function POST(req: Request) {
  try {
    const account = await sessionAccount();
    if (!account) {
      return NextResponse.json({ error: "Sign in again to continue." }, { status: 401 });
    }
    if (!account.user.mustResetPassword) {
      return NextResponse.json({ error: "Password reset is not required for this account." }, { status: 409 });
    }

    const input = await readAuthRequest(req);
    const password = String(input.newPassword || "");
    const confirmPassword = String(input.confirmPassword || "");
    const returnTo = safeReturnPath(input.returnTo);
    if (!password || !confirmPassword) {
      return NextResponse.json({ error: "Enter and confirm the new password." }, { status: 400 });
    }
    if (password !== confirmPassword) {
      return NextResponse.json({ error: "Password confirmation does not match." }, { status: 400 });
    }
    const strengthError = passwordStrengthError(password);
    if (strengthError) {
      return NextResponse.json({ error: strengthError }, { status: 400 });
    }

    const db = getDb();
    await db
      .update(authUsers)
      .set({
        passwordHash: hashPassword(password),
        mustResetPassword: false,
      })
      .where(eq(authUsers.id, account.user.id));

    await destroyUserSessions(account.user.id);
    const token = await createSession(account.user.id);
    const res = NextResponse.json({ ok: true, next: returnTo });
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
    console.error("First-login password reset failed", error instanceof Error ? error.name : 'Unknown error');
    return NextResponse.json({ error: "Unable to update password right now." }, { status: 500 });
  }
}
