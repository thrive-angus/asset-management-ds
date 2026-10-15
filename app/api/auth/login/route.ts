import { NextResponse } from "next/server";
import { authenticateByPassword, createSession, SESSION_COOKIE } from "../../../local-auth";

function safeReturnPath(value: unknown): string {
  if (typeof value !== "string") return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export async function POST(req: Request) {
  try {
    const input = (await req.json()) as Record<string, unknown>;
    const email = String(input?.email || "").trim().toLowerCase();
    const password = String(input?.password || "");
    const returnTo = safeReturnPath(input?.returnTo);
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const user = await authenticateByPassword(email, password);
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

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
    console.error("Login failed", error);
    return NextResponse.json({ error: "Unable to sign in right now." }, { status: 500 });
  }
}
