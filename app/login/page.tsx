import LoginForm from "@/components/LoginForm";

export const dynamic = "force-dynamic";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { invalid?: string };
}) {
  return <LoginForm invalid={searchParams.invalid === "1"} />;
}
