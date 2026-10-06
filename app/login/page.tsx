import { redirect } from "next/navigation";
import { getAppUser, safeRelativeReturnPath } from "../auth";
import LoginForm from "./login-form";

type LoginPageProps = {
  searchParams?: {
    return_to?: string | string[];
  };
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getAppUser();
  const returnToParam = searchParams?.return_to;
  const rawReturnTo = typeof returnToParam === "string" ? returnToParam : "/";
  const returnTo = safeRelativeReturnPath(rawReturnTo);

  if (user) redirect(returnTo);

  return <LoginForm returnTo={returnTo} />;
}