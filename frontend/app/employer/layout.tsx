"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authUser, token } from "@/lib/api";

export default function EmployerLayout({ children }: { children: React.ReactNode }) {
  const r = useRouter();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!token()) { r.replace("/login"); return; }
    if (authUser()?.role !== "employer") { r.replace("/candidate/jobs"); return; }
    setReady(true);
  }, [r]);
  if (!ready) return <p className="p-6 text-neutral-500">Loading...</p>;
  return <div className="theme-employer">{children}</div>;
}
