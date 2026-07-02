/**
 * CriteriaSection — PI qualification / intake criteria, rendered FLAT.
 *
 * Presentational + generic: no "use client" directive and no hooks, so it works
 * in both server and client trees (the Strategy deck is a client tree today; a
 * tort page could adopt it as a server component later). It takes the merged
 * `StrategyQualificationCriteria` (universal block + case-type delta already
 * concatenated by lib/queries/pi-qualification-criteria.ts) and renders the
 * screening questions, disqualifiers, and case-type factors in flat lists.
 *
 * Provenance is surfaced honestly: each item shows an observed/inferred pill,
 * and a small legend (reusing the deck's WhitespaceLegend vocabulary — mono
 * label, NAVY/MUTED colors, border-top) explains the two. Boating Jones Act
 * questions are labeled with a "[Jones Act]" badge read from the stored `theory`
 * tag — NO conditional branching UI; the branch tags stay data, not flow.
 */
import type {
  CriteriaItem,
  CriteriaScreeningQuestion,
  StrategyQualificationCriteria,
} from "@/lib/strategy-engine/standalone";

const NAVY = "#0B1D3A";
const LIGHT = "#F4F7FA";
const BORDER = "#DCE4ED";
const MUTED = "#5C6E86";
const LABEL = "#8696AC";
const CHIP = "#E9EFF5";
const ACCENT = "var(--lmi-accent, #1A8C96)";
const mono = "ui-monospace, SFMono-Regular, Menlo, monospace";

function prettyCaseType(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** observed = counted from a live ad/intake form; inferred = standard practice
 *  / the logical inverse of what ads screen for. Restrained, not loud. */
function EvidencePill({ evidence }: { evidence: "observed" | "inferred" | null }) {
  if (!evidence) return null;
  const observed = evidence === "observed";
  return (
    <span
      className="rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={
        observed
          ? { background: CHIP, color: "#4A5E78", border: `1px solid ${BORDER}` }
          : { background: "transparent", color: MUTED, border: `1px dashed #C9D4E0` }
      }
    >
      {evidence}
    </span>
  );
}

/** The forward-looking Jones Act branch tag, surfaced as a quiet badge. */
function TheoryBadge({ theory }: { theory: string | null }) {
  if (theory !== "jones_act") return null;
  return (
    <span
      className="rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
      style={{ background: NAVY, color: "#fff" }}
    >
      Jones Act
    </span>
  );
}

/** Strip a leading "[Jones Act] " marker — the badge carries that signal now. */
function cleanText(t: string): string {
  return t.replace(/^\[Jones Act\]\s*/i, "");
}

function ItemRow({ item }: { item: CriteriaItem }) {
  return (
    <li className="flex items-start gap-2 py-1.5 text-sm" style={{ color: "#3A4D67" }}>
      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: ACCENT }} />
      <span className="min-w-0 flex-1">{cleanText(item.label)}</span>
      <span className="flex shrink-0 items-center gap-1.5">
        <TheoryBadge theory={item.theory} />
        <EvidencePill evidence={item.evidence} />
      </span>
    </li>
  );
}

function QuestionRow({ q }: { q: CriteriaScreeningQuestion }) {
  return (
    <li className="border-b py-3 last:border-b-0" style={{ borderColor: "#E0E7EF" }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold" style={{ color: NAVY }}>
            {cleanText(q.question)}
          </div>
          {q.purpose ? (
            <div className="mt-0.5 text-sm" style={{ color: MUTED }}>
              {q.purpose}
            </div>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <TheoryBadge theory={q.theory} />
          <EvidencePill evidence={q.evidence} />
        </div>
      </div>
    </li>
  );
}

function Legend() {
  return (
    <div
      className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 border-t pt-3 text-[11px]"
      style={{ borderColor: BORDER, color: MUTED }}
    >
      <span style={{ fontFamily: mono, color: LABEL }} className="uppercase tracking-wide">
        Key
      </span>
      <span>
        <b style={{ color: NAVY }}>Observed</b> = seen on a live ad / intake form ·{" "}
        <b style={{ color: NAVY }}>Inferred</b> = standard contingency practice / the inverse of what ads screen for.
      </span>
      <span>
        <b style={{ color: NAVY }}>Jones Act</b> — maritime crew branch; shown here, routed in a later version.
      </span>
    </div>
  );
}

export default function CriteriaSection({
  criteria,
  tieIn,
}: {
  criteria: StrategyQualificationCriteria;
  /** Optional deck-specific connecting line (e.g. tie to the lead→signed lever). */
  tieIn?: string;
}) {
  const caseLabel = prettyCaseType(criteria.case_type);
  const confidence = criteria.confidence ? criteria.confidence.replace(/_/g, " ") : null;

  return (
    <section className="rounded-2xl border p-8" style={{ borderColor: BORDER, background: LIGHT }}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>
            Qualify the lead
          </div>
          <h3 className="mt-2 text-2xl font-bold md:text-3xl" style={{ color: NAVY }}>
            Who signs, and who gets screened out
          </h3>
          <div className="mt-1 text-sm" style={{ color: MUTED }}>
            {caseLabel} intake · the shared PI block plus the {caseLabel.toLowerCase()} delta
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {confidence ? (
            <span
              style={{ fontFamily: mono, background: CHIP, border: `1px solid ${BORDER}`, color: "#4A5E78" }}
              className="rounded px-2 py-0.5 text-[10px] uppercase tracking-wide"
            >
              {confidence} confidence
            </span>
          ) : null}
        </div>
      </div>

      {/* Screening questions — universal block first, then the case-type delta */}
      {criteria.screening_questions.length > 0 ? (
        <div className="rounded-xl border bg-white p-5" style={{ borderColor: BORDER }}>
          <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: ACCENT }}>
            Screening questions
          </div>
          <ul className="mt-1">
            {criteria.screening_questions.map((q) => (
              <QuestionRow key={q.id || q.question} q={q} />
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        {/* Disqualifiers */}
        {criteria.disqualifiers.length > 0 ? (
          <div className="rounded-xl border bg-white p-5" style={{ borderColor: BORDER }}>
            <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: ACCENT }}>
              Disqualifiers
            </div>
            <ul className="mt-1">
              {criteria.disqualifiers.map((d, i) => (
                <ItemRow key={`${d.label}-${i}`} item={d} />
              ))}
            </ul>
          </div>
        ) : null}

        {/* Case-type-specific factors */}
        {criteria.case_type_specific_factors.length > 0 ? (
          <div className="rounded-xl border bg-white p-5" style={{ borderColor: BORDER }}>
            <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: ACCENT }}>
              What moves value on {caseLabel.toLowerCase()} cases
            </div>
            <ul className="mt-1">
              {criteria.case_type_specific_factors.map((f, i) => (
                <ItemRow key={`${f.label}-${i}`} item={f} />
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {/* SOL note */}
      {criteria.sol_note ? (
        <div className="mt-5 rounded-xl border p-5" style={{ borderColor: BORDER, background: "#fff" }}>
          <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: ACCENT }}>
            Statute of limitations
          </div>
          <p className="mt-1 text-sm" style={{ color: "#3A4D67" }}>
            {criteria.sol_note}
          </p>
        </div>
      ) : null}

      {tieIn ? (
        <div
          className="mt-5 flex items-center gap-4 rounded-xl p-5 text-white"
          style={{ background: NAVY }}
        >
          <span className="h-9 w-1.5 shrink-0 rounded" style={{ background: "var(--lmi-accent-2, #3FBEC8)" }} />
          <span className="text-base font-medium">{tieIn}</span>
        </div>
      ) : null}

      <Legend />

      {criteria.source_notes ? (
        <p className="mt-3 text-[11px]" style={{ color: MUTED }}>
          {criteria.source_notes}
        </p>
      ) : null}
    </section>
  );
}
