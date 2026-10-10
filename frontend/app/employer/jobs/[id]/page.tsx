"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function JobCandidatesRedirectPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(`/employer?job_id=${params.id}`);
  }, [router, params.id]);
  return null;
}
