import { clearAppSession, safeRelativeReturnPath } from "../../../auth";

export async function GET(req: Request) {
  await clearAppSession();
  const url = new URL(req.url);
  const returnTo = safeRelativeReturnPath(url.searchParams.get("return_to") || "/login");
  return Response.redirect(new URL(returnTo, url.origin), 302);
}

export async function POST(req: Request) {
  await clearAppSession();
  let returnTo = "/login";

  try {
    const input: any = await req.json();
    if (typeof input?.returnTo === "string") {
      returnTo = safeRelativeReturnPath(input.returnTo);
    }
  } catch {
    // Return the default path when there is no body.
  }

  return Response.json({ ok: true, redirectTo: returnTo });
}