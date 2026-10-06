import { getAppUser } from "../../../auth";

export async function GET() {
  const user = await getAppUser();
  if (!user) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }

  return Response.json({
    user: {
      displayName: user.displayName,
      email: user.email,
    },
  });
}