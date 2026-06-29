/**
 * Derives the four Design-D "verdict" cards (PI Viability / Negligence Rule /
 * Top Opportunity / Competition) for any state, from the data the v2 state page
 * already loads. Notes are templated from each state's own numbers; optional
 * `StateContent` overrides win when present (Florida can't say "dragged by the
 * contributory rule" — it's comparative, not contributory).
 *
 * Pure module (no JSX) so it stays importable from the client component and
 * unit-testable. The presentational `VerdictRow` lives in state-top-of-page.tsx.
 */
import type { VerdictCardProps } from "./VerdictCard";
import type { ChipTone, ViabilityBand } from "./viability";
import { scoreColor, viabilityBand } from "./viability";

/* viz-band hexes (per DESIGN.md) keyed by semantic tone. */
const TONE_HEX: Record<ChipTone, string> = {
  good: "#16A34A",
  mid: "#E0A030",
  bad: "#DC2626",
  info: "#2E5077",
};

export type NegTone = ChipTone;

export interface NegligenceMeta {
  /** Compact label for the sticky pill, e.g. "Contributory", "Mod. Comp. 51%". */
  short: string;
  /** Full label for the hero pill, e.g. "Modified Comparative (51% Bar)". */
  full: string;
  /** Severity tone — contributory is harshest (bad), pure comparative friendliest (good). */
  tone: NegTone;
  /** One-line "so what" for the verdict card. */
  note: string;
  /** Verdict-card chip label, e.g. "High bar". */
  chip: string;
}

/** Map a negligence_rule string to its labels, severity tone, and plain-English note. */
export function negligenceMeta(rule: string | null | undefined): NegligenceMeta {
  switch (rule) {
    case "contributory":
      return {
        short: "Contributory",
        full: "Contributory Negligence",
        tone: "bad",
        chip: "High bar",
        note: "Any plaintiff fault bars recovery. 1 of 4 states (+DC).",
      };
    case "modified_51":
      return {
        short: "Mod. Comp. 51%",
        full: "Modified Comparative (51% Bar)",
        tone: "mid",
        chip: "Moderate bar",
        note: "Plaintiff barred once 51%+ at fault.",
      };
    case "modified_50":
      return {
        short: "Mod. Comp. 50%",
        full: "Modified Comparative (50% Bar)",
        tone: "mid",
        chip: "Moderate bar",
        note: "Plaintiff barred once 50%+ at fault.",
      };
    case "pure_comparative":
      return {
        short: "Pure Comparative",
        full: "Pure Comparative",
        tone: "good",
        chip: "Plaintiff-friendly",
        note: "Recovery only reduced by the plaintiff's share of fault.",
      };
    default:
      return {
        short: rule ?? "—",
        full: rule ?? "Not available",
        tone: "info",
        chip: "—",
        note: "Comparative-fault rules govern recovery.",
      };
  }
}

export interface CaseTypeVolume {
  /** Display label, e.g. "Motor Vehicle". */
  label: string;
  /** Lowercase noun for the note, e.g. "MVA", "truck", "motorcycle". */
  noun: string;
  /** Fatal-death count driving the ranking. */
  value: number;
  /** Top counties for this case type. */
  topCounties: string[];
}

export interface VerdictDeriveInput {
  composite: number;
  negligenceRule: string | null;
  /** Component scores (name + 0-100), used to name the biggest viability drag. */
  componentScores: { name: string; score: number }[];
  /** Case-type volumes, already computed in the client (MVA / truck / moto …). */
  caseTypes: CaseTypeVolume[];
  /** Cleaned top competitor firm names (advertiser_name ?? prettified domain). */
  competitorNames: string[];
  /** Total tracked competitors in-state (drives the level). */
  competitorCount: number;
  /** Optional hand-written overrides. */
  overrides?: {
    viabilityNote?: string;
    topOpportunityNote?: string;
    competitionNote?: string;
  };
}

function fmtNum(n: number): string {
  return n.toLocaleString();
}

/** Build the four verdict cards for a state. Always returns 4 cards. */
export function deriveStateVerdictCards(input: VerdictDeriveInput): VerdictCardProps[] {
  const {
    composite,
    negligenceRule,
    componentScores,
    caseTypes,
    competitorNames,
    competitorCount,
    overrides = {},
  } = input;

  const band: ViabilityBand = viabilityBand(composite);
  const neg = negligenceMeta(negligenceRule);

  /* -- PI Viability -- */
  const lowest = [...componentScores]
    .filter((c) => c.score > 0)
    .sort((a, b) => a.score - b.score)[0];
  const viabilityNote =
    overrides.viabilityNote ??
    (composite >= 75
      ? "Favorable across damages caps, statute, and jury verdicts."
      : lowest
        ? `${lowest.name} is the biggest drag on viability.`
        : "Composite of negligence, caps, statute, and verdict signals.");

  /* -- Top Opportunity -- */
  const top = [...caseTypes].sort((a, b) => b.value - a.value)[0] ?? {
    label: "Motor Vehicle",
    noun: "MVA",
    value: 0,
    topCounties: [],
  };
  const topCounties = top.topCounties.filter(Boolean).slice(0, 2).join(" · ");
  const topOpportunityNote =
    overrides.topOpportunityNote ??
    (top.value > 0
      ? `${fmtNum(top.value)} ${top.noun} deaths${topCounties ? ` · ${topCounties}` : ""}.`
      : "Highest-demand single-event case type for this market.");

  /* -- Competition -- */
  const level =
    competitorCount >= 15
      ? "Crowded"
      : competitorCount >= 6
        ? "Active"
        : competitorCount >= 1
          ? "Emerging"
          : "Open field";
  const competitionChip =
    competitorCount >= 6 ? "Metros crowded" : competitorCount >= 1 ? "Room to enter" : "First-mover";
  // Firm identity in the ad data is the domain (advertiser_name is often an ad
  // headline), so the auto note is count-based — accurate without risking a
  // garbled name in a prominent card. `competitionNote` supplies curated firm
  // names (e.g. "Shunnarah & Morgan dominate") where an analyst has them.
  const cleanNames = competitorNames.filter((n) => n && n.length > 1).slice(0, 2);
  const competitionNote =
    overrides.competitionNote ??
    (cleanNames.length >= 2
      ? `${cleanNames.join(" & ")} lead the paid-search field.`
      : competitorCount >= 6
        ? `${competitorCount} firms competing across the state's metros.`
        : competitorCount >= 1
          ? `${competitorCount} PI advertisers tracked — still room to enter.`
          : "Few PI advertisers tracked here yet — first-mover room.");

  return [
    {
      top: scoreColor(composite),
      label: "PI viability",
      value: composite ? String(composite) : "—",
      valueSuffix: "/100",
      chip: band.label,
      chipTone: band.tone,
      note: viabilityNote,
    },
    {
      top: TONE_HEX[neg.tone],
      label: "Negligence rule",
      value: neg.short,
      chip: neg.chip,
      chipTone: neg.tone,
      note: neg.note,
    },
    {
      top: TONE_HEX.good,
      label: "Top opportunity",
      value: top.label,
      chip: "High demand",
      chipTone: "good",
      note: topOpportunityNote,
    },
    {
      top: TONE_HEX.info,
      label: "Competition",
      value: level,
      chip: competitionChip,
      chipTone: "info",
      note: competitionNote,
    },
  ];
}
