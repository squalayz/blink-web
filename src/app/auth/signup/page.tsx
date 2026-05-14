import { redirect } from "next/navigation";

// Wallet-only login — there is no separate signup. Connecting a fresh wallet
// IS the signup flow.
export default function SignupPage(): never {
  redirect("/auth/signin");
}
