/**
 * Strategy Engine — AI writer contract (writer, not strategist).
 *
 * The deterministic core has already chosen the archetype, built the channel
 * plan, and written the data-traced rationales. The LLM's ONLY job is to
 * narrate that plan in the chosen voice. It does not pick channels, invent
 * outlets, or compute numbers.
 *
 * Three-layer enforcement of the council's hard rule (no absolute reach):
 *   1. The digest we send contains no reach/impression figures (only shares,
 *      indices, rates, confidence tiers).
 *   2. The system prompt forbids inventing or citing reach.
 *   3. `containsAbsoluteReach` rejects prose that slips one in (validator + test).
 *
 * Pure module — no Next, no Supabase. Mirrors the proven
 * generate-pi-strategic-brief/testable.ts structure.
 */

import { CHANNEL_LABELS } from "./types";
import type {
  ArchetypeKey,
  Cadence,
  Confidence,
  FunnelEmphasis,
  StrategyPlan,
  StrategyProse,
  Voice,
} from "./types";

/* ── Request contract ───────────────────────────────────────────────────── */

export interface StrategyRequest {
  /** 2-letter uppercase state code. */
  state: string;
  archetype: ArchetypeKey;
  cadence?: Cadence;
  funnel?: FunnelEmphasis;
  voice: Voice;
  /** Optional overrides; default to the PI segment. */
  tort_slug?: string;
  tort_label?: string;
}

const ARCHETYPE_KEYS = new Set<ArchetypeKey>([
  "head_to_head",
  "niche_carve_out",
  "audience_play",
]);
const CADENCES = new Set<Cadence>(["always_on", "surge"]);
const FUNNELS = new Set<FunnelEmphasis>(["brand_led", "conversion_led"]);
const VOICES = new Set<Voice>(["firm", "agency", "seller"]);

export function validateStrategyRequest(body: StrategyRequest): string[] {
  const errors: string[] = [];
  if (!body.state || !/^[A-Z]{2}$/.test(body.state)) {
    errors.push("state is required (2-letter uppercase state code)");
  }
  if (!body.archetype || !ARCHETYPE_KEYS.has(body.archetype)) {
    errors.push("archetype must be one of head_to_head, niche_carve_out, audience_play");
  }
  if (!body.voice || !VOICES.has(body.voice)) {
    errors.push("voice must be one of firm, agency, seller");
  }
  if (body.cadence && !CADENCES.has(body.cadence)) {
    errors.push("cadence must be always_on or surge");
  }
  if (body.funnel && !FUNNELS.has(body.funnel)) {
    errors.push("funnel must be brand_led or conversion_led");
  }
  return errors;
}

/* ── Voice guidance ─────────────────────────────────────────────────────── */

export const VOICE_GUIDANCE: Record<Voice, string> = {
  firm: "Audience: a plaintiff law firm partner / in-house marketing lead. Speak to case acquisition and budget efficiency. 'You' = the firm.",
  agency:
    "Audience: a legal-focused ad agency building a client plan. Speak to campaign thesis, channel architecture, and a defensible rationale to present to the firm.",
  seller:
    "Audience: a media seller (TV/radio/CTV rep). Frame why this inventory fits the PI buyer's strategy and what objection to expect — without overpromising reach.",
};

/* ── System prompt ──────────────────────────────────────────────────────── */

export const STRATEGY_SYSTEM_PROMPT = `You are a media strategist WRITING UP a media plan that has ALREADY been decided for a U.S. plaintiff personal-injury law firm.

You will receive a PLAN object: the chosen strategy archetype, a funnel-sequenced channel list (each with named local outlets), a county→DMA translation, a "first moves" list, and a confidence tier. The strategy is fixed. Your job is to NARRATE it, not to change it.

Return a STRICT JSON object with these fields:
  market_read         — 2-3 sentences. Open with the single sharpest signal in the plan (the dominant-advertiser situation, the saturation read, or the strongest channel whitespace).
  approach_rationale  — 2-4 sentences. Explain why the chosen archetype is right here, in the requested VOICE. Reference the plan's own "why this fits" reasoning.
  channel_narrative   — One paragraph walking the awareness → consideration → conversion sequence, naming the outlets the plan named.
  notes               — Optional. A caveat only if the plan's confidence is "directional" or a stage is empty. Otherwise omit.

CRITICAL RULES:
1. NEVER state absolute reach, impressions, audience size, viewer counts, listener counts, or "X people". The plan deliberately contains none. Speak in relative terms: "over-indexes", "light competition", "the leading channel", confidence tiers.
2. NEVER invent an outlet, county, channel, competitor, or number that is not in the PLAN object.
3. Do NOT give legal advice. Everything is advertising strategy.
4. Match the requested VOICE exactly.
5. Plain text only inside JSON string fields — no markdown.
6. Be direct and decision-oriented. No hedging ("you may want to consider"), no hype.
7. A channel's fit_basis tells you what the fit rests on. When it is "news-consumption proxy", describe that channel's audience fit as a news-consumption proxy (not a measured reach). When you cite a consumption pattern, attribute it to the channel's fit_sources (e.g. "per Pew", "per Nielsen") and never invent a percentage — fit_index is a relative index, not a reach figure.

Return ONLY the JSON object. No markdown fences. No commentary.`;

/* ── Digest (what the LLM actually sees — reach-free by construction) ────── */

/**
 * A compact, reach-free projection of the plan for the prompt. We intentionally
 * drop nothing the LLM needs and add nothing it could misread as reach.
 */
export function buildStrategyDigest(plan: StrategyPlan) {
  const stage = (s: "awareness" | "consideration" | "conversion") =>
    plan.channel_plan.stages[s].map((c) => ({
      channel: CHANNEL_LABELS[c.channel],
      fit_index: Math.round(c.fit * 100),
      fit_basis: c.fit_scope === "news_proxy" ? "news-consumption proxy" : "general reach",
      fit_sources: c.fit_sources ?? [],
      competition: c.competition == null ? "unknown" : c.competition <= 0.35 ? "light" : c.competition >= 0.65 ? "heavy" : "moderate",
      outlets: c.outlets.map((o) => ({
        name: o.name,
        format: o.format_genre ?? null,
        dma: o.dma_name ?? null,
      })),
    }));

  return {
    state: plan.state_name,
    case_type: plan.tort_label,
    archetype: plan.archetype.key,
    archetype_why_this_fits: plan.archetype.why_this_fits,
    archetype_why_not_alternatives: plan.archetype.why_not_alternatives,
    cadence: plan.channel_plan.cadence,
    funnel_emphasis: plan.channel_plan.funnel,
    dominant_advertiser: plan.gorilla.present
      ? { name: plan.gorilla.name, situation: plan.gorilla.reason }
      : null,
    funnel: {
      awareness: stage("awareness"),
      consideration: stage("consideration"),
      conversion: stage("conversion"),
    },
    county_to_dma: plan.channel_plan.county_dma_translation.slice(0, 6).map((l) => ({
      county: l.county_name,
      dma: l.dma_name,
    })),
    first_moves: plan.first_moves.map((m) => m.action),
    confidence: plan.confidence,
  };
}

export function buildStrategyUserPrompt(plan: StrategyPlan, voice: Voice): string {
  return [
    VOICE_GUIDANCE[voice],
    "",
    "PLAN (narrate this exactly; do not change channels, outlets, or numbers):",
    "```json",
    JSON.stringify(buildStrategyDigest(plan), null, 2),
    "```",
    "",
    "Return JSON: { market_read, approach_rationale, channel_narrative, notes? }",
  ].join("\n");
}

/* ── No-absolute-reach guard ────────────────────────────────────────────── */

/**
 * Detects prose that states an absolute audience figure — the one thing the
 * council banned. Catches "1,200,000 impressions", "reaches 312,000 adults",
 * "2.4 million viewers", "500k listeners". Deliberately does NOT flag rates
 * ("per 100k"), index values, percentages, or money.
 */
export function containsAbsoluteReach(text: string): boolean {
  const t = text.toLowerCase();
  // A big number (with separators, or a "<num> million/k") sitting next to a
  // reach noun within a short window.
  const reachNoun =
    "(impressions?|reach(?:es|ed)?|viewers?|listeners?|audiences?|people|adults|households|eyeballs|users)";
  const bigNumber =
    "(\\d{1,3}(?:,\\d{3})+|\\d+(?:\\.\\d+)?\\s*(?:million|billion|thousand|k|m)\\b)";

  // "per 100k" / "per 100,000" is a rate — explicitly allowed.
  const rateGuard = /per\s*100[,]?0*k?|per\s*100,000/;

  const near1 = new RegExp(`${bigNumber}[^.;\\n]{0,30}${reachNoun}`, "i");
  const near2 = new RegExp(`${reachNoun}[^.;\\n]{0,30}${bigNumber}`, "i");

  for (const re of [near1, near2]) {
    const m = t.match(re);
    if (m && !rateGuard.test(m[0])) return true;
  }
  return false;
}

/* ── Response validation ────────────────────────────────────────────────── */

export function stripJSONWrapper(content: string): string {
  let cleaned = content.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n/i, "");
    cleaned = cleaned.replace(/\n```\s*$/i, "");
  }
  return cleaned.trim();
}

/**
 * Validate the LLM prose. Tolerant on the optional `notes`; truncates long
 * fields; REJECTS any field containing an absolute-reach figure.
 */
export function validateStrategyProse(
  parsed: unknown,
): { ok: true; value: StrategyProse } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, errors: ["response is not an object"] };
  }
  const obj = parsed as Record<string, unknown>;

  function takeString(field: string, max: number, required: boolean): string {
    const v = obj[field];
    if (typeof v === "string" && v.trim()) {
      const s = v.trim().slice(0, max);
      if (containsAbsoluteReach(s)) {
        errors.push(`${field} contains an absolute reach/impression figure (banned)`);
        return "";
      }
      return s;
    }
    if (required) errors.push(`${field} must be a non-empty string`);
    return "";
  }

  const market_read = takeString("market_read", 600, true);
  const approach_rationale = takeString("approach_rationale", 700, true);
  const channel_narrative = takeString("channel_narrative", 900, true);

  let notes: string | undefined;
  if (typeof obj.notes === "string" && obj.notes.trim()) {
    const n = obj.notes.trim().slice(0, 500);
    if (containsAbsoluteReach(n)) {
      errors.push("notes contains an absolute reach/impression figure (banned)");
    } else {
      notes = n;
    }
  }

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: { market_read, approach_rationale, channel_narrative, notes },
  };
}

/** Plain-language label for a confidence tier (UI + slides). */
export function confidenceLabel(c: Confidence): string {
  return c === "high" ? "High confidence" : c === "moderate" ? "Moderate confidence" : "Directional";
}
