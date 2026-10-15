import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const returnTo = url.searchParams.get("return_to") || "/";
  return NextResponse.redirect(
    new URL(`/logout?return_to=${encodeURIComponent(returnTo)}`, url.origin),
  );
}
