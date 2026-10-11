import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; workspace?: string }>;
}) {
  const { from, workspace } = await searchParams;
  return <LoginForm from={from ?? ""} workspace={workspace ?? ""} />;
}
