"use client";
import Link from "next/link";
import { DemoLogins, LoginForm } from "@/components/AuthForm";

export default function Page() {
  return (
    <div>
      <LoginForm />
      <DemoLogins />
      <p className="mx-auto mt-4 max-w-md text-center text-sm text-neutral-500">
        No account yet? Candidates need an invite link — employers join freely.{" "}
        <Link href="/signup?role=candidate" className="font-semibold text-black underline underline-offset-4">
          Candidate Sign Up
        </Link>{" "}
        ·{" "}
        <Link href="/signup?role=employer" className="font-semibold text-black underline underline-offset-4">
          Employer Sign Up
        </Link>
      </p>
    </div>
  );
}
