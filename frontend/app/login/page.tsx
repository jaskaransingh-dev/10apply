"use client";
import Link from "next/link";
import { LoginForm } from "@/components/AuthForm";

export default function Page() {
  return (
    <div>
      <LoginForm />
      <p className="mx-auto mt-4 max-w-md text-center text-sm text-neutral-500">
        No account yet?{" "}
        <Link href="/waitlist" className="font-semibold text-black underline underline-offset-4">
          Join the waitlist
        </Link>
      </p>
    </div>
  );
}
