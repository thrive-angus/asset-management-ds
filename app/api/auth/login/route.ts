import { getLoginEmail, getLoginPassword, safeRelativeReturnPath, setAppSession } from "../../../auth";

export async function POST(req: Request) {
  try {
    const input: any = await req.json();
    const email = typeof input?.email === "string" ? input.email.trim().toLowerCase() : "";
    const password = typeof input?.password === "string" ? input.password : "";
    const returnToRaw =
      typeof input?.returnTo === "string" ? input.returnTo : "/";

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return Response.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    if (!password) {
      return Response.json({ error: "Enter your password." }, { status: 400 });
    }
    if (email !== getLoginEmail() || password !== getLoginPassword()) {
      return Response.json({ error: "Incorrect email or password." }, { status: 401 });
    }

    await setAppSession({
      email,
      displayName: "Dental Stars Demo User",
      fullName: null,
    });

    return Response.json({
      ok: true,
      redirectTo: safeRelativeReturnPath(returnToRaw),
    });
  } catch {
    return Response.json({ error: "Unable to sign in right now. Please retry." }, { status: 500 });
  }
}