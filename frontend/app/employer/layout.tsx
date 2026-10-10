"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { authUser, token } from "@/lib/api";

export default function EmployerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const isRootEmployer = path === "/employer";
  const [authorized, setAuthorized] = useState(isRootEmployer);

  useEffect(() => {
    if (isRootEmployer) {
      setAuthorized(true);
      return;
    }
    const t = token();
    const user = authUser();
    if (!t) {
      router.replace("/employer");
      return;
    }
    if (user?.role !== "employer" && user?.role !== "recruiter" && user?.role !== "admin") {
      router.replace("/candidate/jobs");
      return;
    }
    setAuthorized(true);
  }, [router, isRootEmployer]);

  if (!authorized && !isRootEmployer) {
    return <div className="p-12 text-center text-xs text-neutral-400">Verifying authorization...</div>;
  }

  return <div>{children}</div>;
}
