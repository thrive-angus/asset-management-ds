import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { destroySession, SESSION_COOKIE } from "../local-auth";
import { safeReturnPath } from '../safe-return-path';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const returnTo = safeReturnPath(url.searchParams.get("return_to"));
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token) await destroySession(token);

  const res = NextResponse.redirect(new URL(returnTo, url.origin));
  res.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}
