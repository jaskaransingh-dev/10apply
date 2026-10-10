"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProfileRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/candidate/upload");
  }, [router]);
  return null;
}
