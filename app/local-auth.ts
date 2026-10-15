import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { authSessions, authUsers } from "../db/schema";
import { verifyPassword } from "./password-auth";

export const SESSION_COOKIE = "ds_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

export type AuthIdentity = {
  userId: string;
  displayName: string;
  email: string;
  fullName: string | null;
  mustResetPassword: boolean;
};

type SessionAccount = {
  token: string;
  user: {
    id: string;
    email: string;
    displayName: string;
    mustResetPassword: boolean;
  };
};

function parseMustReset(value: unknown): boolean {
  return value === true || value === "true" || value === 1;
}

export async function authenticateByPassword(email: string, password: string) {
  const normalized = email.trim().toLowerCase();
  const user = (
    await getDb().select().from(authUsers).where(eq(authUsers.email, normalized))
  )[0];
  if (!user) return null;
  if (!verifyPassword(password, user.passwordHash)) return null;

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    mustResetPassword: parseMustReset((user as Record<string, unknown>).mustResetPassword),
  };
}

export async function createSession(userId: string): Promise<string> {
  const now = new Date();
  const token = crypto.randomUUID();
  await getDb().insert(authSessions).values({
    id: token,
    userId,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + SESSION_TTL_MS).toISOString(),
  });
  return token;
}

export async function destroySession(token: string) {
  await getDb().delete(authSessions).where(eq(authSessions.id, token));
}

export async function destroyUserSessions(userId: string) {
  await getDb().delete(authSessions).where(eq(authSessions.userId, userId));
}

export async function sessionAccount(): Promise<SessionAccount | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = (
    await getDb().select().from(authSessions).where(eq(authSessions.id, token))
  )[0];
  if (!session) return null;
  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    await destroySession(token);
    return null;
  }

  const user = (
    await getDb().select().from(authUsers).where(eq(authUsers.id, session.userId))
  )[0];
  if (!user) {
    await destroySession(token);
    return null;
  }

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      mustResetPassword: parseMustReset((user as Record<string, unknown>).mustResetPassword),
    },
  };
}

export async function sessionIdentity(): Promise<AuthIdentity | null> {
  const account = await sessionAccount();
  if (!account) return null;
  const user = account.user;

  return {
    userId: user.id,
    email: user.email,
    displayName: user.displayName || user.email,
    fullName: user.displayName || null,
    mustResetPassword: user.mustResetPassword,
  };
}
