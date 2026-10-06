import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type AppUser = {
  userId: string;
  displayName: string;
  email: string;
  fullName: string | null;
};

type SessionClaims = {
  uid: string;
  email: string;
  name: string;
  fullName: string | null;
  iat: number;
  exp: number;
};

const SESSION_COOKIE_NAME = "dsam_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12;
const DEFAULT_LOGIN_EMAIL = "demo@dentalstars.local";
const DEFAULT_LOGIN_PASSWORD = "dentalstars123";

const encoder = new TextEncoder();

export function getLoginPassword(): string {
  return process.env.APP_LOGIN_PASSWORD || DEFAULT_LOGIN_PASSWORD;
}

export function getLoginEmail(): string {
  return (process.env.APP_LOGIN_EMAIL || DEFAULT_LOGIN_EMAIL).trim().toLowerCase();
}

export async function getAppUser(): Promise<AppUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const claims = await verifyToken(token);
  if (!claims) return null;

  return {
    userId: claims.uid,
    displayName: claims.name,
    email: claims.email,
    fullName: claims.fullName,
  };
}

export async function requireAppUser(returnTo: string): Promise<AppUser> {
  const user = await getAppUser();
  if (user) return user;

  redirect(loginPath(returnTo));
}

export async function setAppSession(input: {
  email: string;
  displayName: string;
  fullName: string | null;
}): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const claims: SessionClaims = {
    uid: crypto.randomUUID(),
    email: input.email,
    name: input.displayName,
    fullName: input.fullName,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  };
  const token = await signToken(claims);
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearAppSession(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export function loginPath(returnTo: string): string {
  const safeReturnTo = safeRelativeReturnPath(returnTo);
  return `/login?return_to=${encodeURIComponent(safeReturnTo)}`;
}

export function safeRelativeReturnPath(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) return "/";

  let url: URL;
  try {
    url = new URL(value, "https://app.local");
  } catch {
    return "/";
  }
  if (url.origin !== "https://app.local") return "/";
  if (url.pathname === "/login") return "/";

  return `${url.pathname}${url.search}${url.hash}`;
}

async function signToken(claims: SessionClaims): Promise<string> {
  const payload = Buffer.from(JSON.stringify(claims), "utf8").toString("base64url");
  const signature = await sign(payload);
  return `${payload}.${signature}`;
}

async function verifyToken(token: string): Promise<SessionClaims | null> {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;
  const expectedSignature = await sign(payload);

  const signatureBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");
  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  let claims: SessionClaims;
  try {
    claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (
    !claims ||
    typeof claims.uid !== "string" ||
    typeof claims.email !== "string" ||
    typeof claims.name !== "string" ||
    (claims.fullName !== null && typeof claims.fullName !== "string") ||
    typeof claims.exp !== "number"
  ) {
    return null;
  }

  if (claims.exp <= Math.floor(Date.now() / 1000)) return null;

  return claims;
}

async function sign(input: string): Promise<string> {
  const secret =
    process.env.APP_SESSION_SECRET ||
    process.env.AUTH_SECRET ||
    "dev-only-change-session-secret";
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(input));
  return Buffer.from(new Uint8Array(signature)).toString("base64url");
}