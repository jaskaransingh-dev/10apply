"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function RedirectJoin() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const invite = searchParams.get("invite") || searchParams.get("code") || "";
    if (invite) {
      router.replace(`/join?code=${encodeURIComponent(invite)}`);
    } else {
      router.replace("/join");
    }
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-500 text-xs font-mono">
      Redirecting to candidate portal...
    </div>
  );
}

export default function SignupRedirectPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-500 text-xs font-mono">Loading...</div>}>
      <RedirectJoin />
    </Suspense>
  );
}
