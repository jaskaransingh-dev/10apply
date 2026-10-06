export default function MatchBadge({ pct, applied }: { pct: number; applied?: boolean }) {
  const v = Math.round(pct ?? 0);
  const cls =
    v >= 75
      ? "bg-emerald-100 text-emerald-900"
      : v >= 50
        ? "bg-amber-100 text-amber-900"
        : "bg-neutral-100 text-neutral-600";
  return (
    <span className={`inline-block text-xs font-bold rounded-full px-2.5 py-1 ${cls}`}>
      {v}% Match{applied ? " · Applied ✓" : ""}
    </span>
  );
}
