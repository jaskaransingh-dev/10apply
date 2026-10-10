"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function WaitlistRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/recruiters/waitlist");
  }, [router]);

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-500 text-xs font-mono">
      Redirecting to recruiter waitlist...
    </div>
  );
}
