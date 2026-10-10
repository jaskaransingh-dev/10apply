"use client";
import Inbox from "@/components/Inbox";

export default function EmployerInboxPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-neutral-900">
          Candidate Messages
        </h1>
        <p className="text-xs text-neutral-500 mt-0.5">
          Direct communication threads with matched candidates.
        </p>
      </div>
      <Inbox />
    </div>
  );
}
