import { redirect } from "next/navigation";

// The shell lives at /dashboard; middleware handles the signed-out case.
export default function Home() {
  redirect("/dashboard");
}
