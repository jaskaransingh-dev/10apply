"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CandidateIndexPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/candidate/jobs");
  }, [router]);
  return null;
}
