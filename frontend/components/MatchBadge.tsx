export default function MatchBadge({ pct, applied }: { pct: number; applied?: boolean }) {
  const v = Math.round(pct ?? 0);
  const cls =
    v >= 80
      ? "bg-neutral-900 text-white"
      : v >= 60
      ? "bg-neutral-100 text-neutral-800 border border-neutral-300"
      : "bg-neutral-50 text-neutral-600 border border-neutral-200";

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-md px-2 py-0.5 ${cls}`}>
      <span>{v}% match</span>
      {applied ? <span className="text-neutral-400">· Applied</span> : null}
    </span>
  );
}
