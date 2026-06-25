/** Compact stat card for the state snapshot row (label · value · sub-line). */
export function SnapshotCard({
  label,
  value,
  sub,
  valueText,
}: {
  label: string;
  value: string;
  sub: string;
  /** Render the value in the heading font (for non-numeric values like a city). */
  valueText?: boolean;
}) {
  return (
    <div className="rounded-xl border border-cloud bg-white p-5 shadow-sm">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-gray">
        {label}
      </div>
      <div
        className={`mt-2 font-bold text-midnight-navy ${valueText ? "font-heading text-2xl" : "font-mono text-[28px]"}`}
      >
        {value}
      </div>
      <div className="mt-1 text-xs text-slate-gray">{sub}</div>
    </div>
  );
}
