"use client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { SignupForm } from "@/components/AuthForm";

function codeFromInvite(raw: string): string {
  const v = (raw || "").trim();
  if (!v) return "";
  // Accept a full link like /signup?invite=ABC123 or a bare code.
  const m = v.match(/[?&]invite=([^&]+)/);
  if (m) return decodeURIComponent(m[1]);
  const tail = v.split("/").pop() || v;
  return tail.split("?").pop() || "";
}

function Body() {
  const q = useSearchParams();
  const role = q.get("role") === "employer" ? "employer" : "candidate";
  const invite = codeFromInvite(q.get("invite") || "");
  return <SignupForm defaultRole={role} defaultInvite={invite} />;
}

export default function Page() {
  return (
    <Suspense fallback={<p className="text-center text-neutral-500">Loading…</p>}>
      <Body />
    </Suspense>
  );
}
