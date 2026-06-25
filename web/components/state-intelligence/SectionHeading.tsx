/** Numbered section heading (e.g. "01  Alabama Overview") for state pages. */
export function SectionHeading({ n, title }: { n: number; title: string }) {
  return (
    <div className="mb-4 flex items-baseline gap-2.5">
      <span className="font-mono text-xs font-semibold tabular-nums text-slate-gray">
        {String(n).padStart(2, "0")}
      </span>
      <h2 className="font-heading text-2xl font-bold text-midnight-navy">{title}</h2>
    </div>
  );
}
