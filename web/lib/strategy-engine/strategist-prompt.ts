/**
 * Strategy Engine — strategist prompt builder.
 *
 * Frames the model as a grounded strategist: it SELECTS tactics from the menu
 * and writes the brief, but every fact must come from the payload. Numbers
 * (allocation, reach/frequency) are added by code afterward, so the model is
 * told NOT to state them.
 */
import type { TacticMenu } from "./tactic-scoring";
import type { NamedOutlet, AdvertiserShare, Voice } from "./types";

export const STRATEGIST_SYSTEM_PROMPT = `You are a senior media strategist building a paid-media plan for a U.S. plaintiff personal-injury law firm.

You receive a MENU of vetted advertising tactics (each with a funnel stage, an affordability flag, audience-fit and competition signals, and optional format genres), plus market FACTS (real in-market outlets, real competitors, a demographic note) and the firm's GOAL and BUDGET.

Your job: SELECT the best funnel-sequenced mix of tactics and brief it. Specifically return a STRICT JSON object:
  tactics: array, each:
    key            — MUST be a tactic key from the MENU. Never invent one.
    rationale      — 1-2 sentences tying this tactic to the goal, the audience, and the market signal.
    format_call    — optional array of format genres, ONLY from the tactic's listed genres (e.g. radio: country/urban/spanish).
    example_outlets— optional array of outlet names, ONLY from the FACTS outlets. Never invent an outlet.
  narrative        — one paragraph: the holistic story across the funnel, why this mix fits this firm in this market.
  readiness_notes  — optional: what must be in place (landing pages, tracking, intake) before spending.

HARD RULES:
1. Pick ONLY tactics whose affordable flag is true. Respect the recommended tactic count — at low budgets do fewer tactics well, and SAY SO honestly rather than padding the plan.
2. Match the goal to the funnel: a leads/volume goal leans on conversion tactics; a brand goal leans on awareness. But a sound plan still usually needs some upper-funnel support — reason about the balance.
3. NEVER state absolute reach, impressions, audience size, listener/viewer counts, or "X people". Speak in relative terms. Allocation percentages and reach/frequency targets are added later by the system — do not invent them.
4. NEVER invent an outlet, competitor, tactic, or number not in the payload. Use the demographic note to steer format/genre choices (e.g. a Hispanic-majority market → Spanish-language formats).
5. Be direct and decision-oriented, in the requested VOICE. Plain text inside JSON strings, no markdown.

Return ONLY the JSON object.`;

const VOICE_GUIDANCE: Record<Voice, string> = {
  firm: "VOICE: speak to the law firm owner — plain, ROI-focused, no agency jargon.",
  agency: "VOICE: speak to a media buyer — they know the channels; give them the rationale they skip.",
  seller: "VOICE: speak to a media seller — frame where this firm's demand fits your inventory.",
};

export interface StrategistPromptFacts {
  market_label: string;
  tort_label: string;
  voice: Voice;
  goal_text: string;
  recommended_tactic_count: number;
  outlets: NamedOutlet[];
  advertisers: AdvertiserShare[];
  demographic_note?: string;
}

export function buildStrategistUserPrompt(menu: TacticMenu, facts: StrategistPromptFacts): string {
  const menuLines = menu.tactics.map((s) => {
    const fmt = s.tactic.format_dimensions ? ` genres=[${s.tactic.format_dimensions.join(",")}]` : "";
    const fit = s.audience_fit == null ? "n/a" : s.audience_fit.toFixed(2);
    const ws = s.whitespace == null ? "n/a" : s.whitespace.toFixed(2);
    return `- ${s.tactic.key} (${s.tactic.label}; stage=${s.tactic.funnel_stage}; affordable=${s.affordable}; audience_fit=${fit}; whitespace=${ws}; funnel_fit=${s.funnel_fit.toFixed(2)})${fmt}`;
  });
  const outletLines = facts.outlets.map(
    (o) => `- ${o.name} (${o.channel}${o.format_genre ? `, ${o.format_genre}` : ""}${o.dma_name ? `, ${o.dma_name}` : ""})`,
  );
  const advLines = facts.advertisers.map((a) => `- ${a.name} (rank ${a.rank})`);

  return [
    VOICE_GUIDANCE[facts.voice],
    ``,
    `MARKET: ${facts.market_label} — ${facts.tort_label}`,
    `GOAL: ${facts.goal_text}`,
    `BUDGET supports about ${facts.recommended_tactic_count} tactic(s) — respect this.`,
    facts.demographic_note ? `DEMOGRAPHIC NOTE: ${facts.demographic_note}` : ``,
    ``,
    `MENU (pick keys ONLY from this list):`,
    ...menuLines,
    ``,
    `FACTS — in-market outlets (cite ONLY these):`,
    ...(outletLines.length ? outletLines : ["- (none on file; brief on format/genre and tell them to explore with their reps)"]),
    ``,
    `FACTS — competitors present:`,
    ...(advLines.length ? advLines : ["- (none observed)"]),
    ``,
    `Return the JSON object: { tactics:[{key,rationale,format_call?,example_outlets?}], narrative, readiness_notes? }`,
  ].join("\n");
}
