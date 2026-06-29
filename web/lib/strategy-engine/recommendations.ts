/**
 * Strategy Engine — recommendation assembler (standalone v1).
 *
 * PURE module (no Supabase, no React, no Next). Turns the deterministic channel
 * plan + the compact per-layer summaries into the deck's product unit: N
 * "recommendation-with-its-because" units, each carrying a 3-link because chain
 * (Opportunity → White space → Fit), a source-tagged proof strip, a named buy,
 * and an explicit data-depth badge. Recommendations that can't fill all three
 * links from real data drop to a watch-list instead of rendering as a rec.
 *
 * It does NOT re-run the planner — it consumes `ChannelPlan` (from
 * channel-plan.ts), the FARS opportunity summary (Layer 1), and the measured
 * white-space channels (Layer 2). The LLM never sees this; in PR 3 it only
 * rewrites the prose around these locked values/sources.
 *
 * Data-depth rule (from the data contract — encoded, not vibes):
 *   strong   = all 3 links from in-state, multi-month, primary data
 *              (FARS + a MEASURED competitive channel + general-scope fit).
 *   moderate = exactly one link modeled or short-window.
 *   thin     = two or more links modeled (e.g. an untracked channel's
 *              white space + a news-proxy fit).
 */

import { CHANNEL_LABELS } from "./types";
export { CHANNEL_LABELS };
import type { ChannelKey, ChannelPlan, NamedOutlet, PlannedChannel } from "./types";

/* ── Inputs (built by the API route from the Layer RPCs) ─────────────────── */

/** Which crash metric leads the opportunity, from the interview's case types. */
export type LeadMetric = "truck" | "motorcycle" | "total";

/** One county row from strategy_opportunity_counties (Layer 1). */
export interface OpportunityCounty {
  county_name: string;
  cbsa_title: string | null;
  total_population: number | null;
  pct_with_internet: number | null;
  total_fatalities: number;
  truck_fatalities: number;
  motorcycle_fatalities: number;
  deaths_per_100k: number | null;
}

/** The Layer-1 opportunity summary for the target market. */
export interface OpportunitySummary {
  /** Counties ranked by exposure (strategy_opportunity_counties order). */
  counties: OpportunityCounty[];
  /** Human market label for headlines, e.g. "Montgomery, AL". */
  market_label: string;
  /** Which crash metric the case types lead with. */
  lead_metric: LeadMetric;
  fars_year_min: number | null;
  fars_year_max: number | null;
}

/** A MEASURED competitive channel from strategy_whitespace_channels (Layer 2).
 *  Only channels that map to an engine ChannelKey are passed (paid_search →
 *  search); organic SEO has no buyable ChannelKey and is dropped by the caller. */
export interface MeasuredChannel {
  channel: ChannelKey;
  active_firms: number;
  status: "open" | "contested" | "defended";
}

/* ── Output (the contract's recommendation unit) ────────────────────────── */

export type LinkDepth = "primary" | "modeled";

/** One link of the because chain. */
export interface RecommendationLink {
  /** The headline figure, e.g. "44" or "none observed". */
  value: string;
  /** Source tag, e.g. "FARS 2019–2024". */
  source: string;
  /** Deterministic sentence (the LLM may rewrite the voice, not the value). */
  text: string;
  depth: LinkDepth;
}

export interface ProofPoint {
  value: string;
  source: string;
}

export type RecommendationBuy =
  | { kind: "outlets"; outlets: NamedOutlet[] }
  | { kind: "channel_target"; target: string };

export type DataDepth = "strong" | "moderate" | "thin";

export interface Recommendation {
  channel: ChannelKey;
  headline: string;
  opportunity: RecommendationLink;
  white_space: RecommendationLink;
  fit: RecommendationLink;
  proof: ProofPoint[];
  buy: RecommendationBuy;
  data_depth: DataDepth;
}

export interface WatchItem {
  channel: ChannelKey;
  /** Why it isn't a full recommendation yet (which link couldn't be filled). */
  reason: string;
}

export interface RecommendationResult {
  recommendations: Recommendation[];
  watch_list: WatchItem[];
}

/* ── Helpers ────────────────────────────────────────────────────────────── */

const DEFAULT_MAX_RECOMMENDATIONS = 3;

/** Pick the lead crash figure for a county, falling back to total. */
function leadFigure(county: OpportunityCounty, metric: LeadMetric): { value: number; label: string } {
  if (metric === "truck" && county.truck_fatalities > 0) {
    return { value: county.truck_fatalities, label: "truck-involved traffic fatalities" };
  }
  if (metric === "motorcycle" && county.motorcycle_fatalities > 0) {
    return { value: county.motorcycle_fatalities, label: "motorcycle fatalities" };
  }
  return { value: county.total_fatalities, label: "traffic fatalities" };
}

function buildOpportunityLink(opp: OpportunitySummary): RecommendationLink | null {
  const top = opp.counties[0];
  if (!top) return null;
  const { value, label } = leadFigure(top, opp.lead_metric);
  if (!value || value <= 0) return null; // no crash exposure → unfillable
  const window =
    opp.fars_year_min && opp.fars_year_max
      ? `${opp.fars_year_min}–${opp.fars_year_max}`
      : "recent years";
  return {
    value: String(value),
    source: `FARS ${window}`,
    text: `${value} ${label} in ${top.county_name} County (FARS ${window}).`,
    depth: "primary",
  };
}

function buildWhiteSpaceLink(
  channel: ChannelKey,
  measured: Map<ChannelKey, MeasuredChannel>,
): RecommendationLink {
  const label = CHANNEL_LABELS[channel];
  const m = measured.get(channel);
  if (m) {
    // Measured channel: a real, in-state firm count (primary).
    return {
      value: `${m.active_firms} ${m.active_firms === 1 ? "firm" : "firms"}`,
      source: channel === "search" ? "pi_search (rolling 90d)" : "ad library",
      text: `${m.active_firms} PI ${m.active_firms === 1 ? "firm is" : "firms are"} active on ${label} here (${m.status}).`,
      depth: "primary",
    };
  }
  // Untracked channel: white space inferred from absence of measured competition.
  return {
    value: "none observed",
    source: "ad-library coverage (modeled)",
    text: `No PI advertiser observed on ${label} in our ad-library coverage — modeled white space.`,
    depth: "modeled",
  };
}

function buildFitLink(ch: PlannedChannel): RecommendationLink {
  const label = CHANNEL_LABELS[ch.channel];
  const index = Math.round(ch.fit * 100);
  const sources = ch.fit_sources && ch.fit_sources.length > 0 ? ch.fit_sources.join(", ") : "media baseline";
  const proxy = ch.fit_scope === "news_proxy";
  return {
    value: `${index}/100`,
    source: `${sources} (national)`,
    text: `Audience-fit index ${index} for ${label}${proxy ? " (news-consumption proxy)" : ""} — national baseline applied to the market's demographics.`,
    depth: proxy ? "modeled" : "primary",
  };
}

/** strong = all primary; moderate = exactly one modeled; thin = 2+ modeled. */
function deriveDataDepth(links: RecommendationLink[]): DataDepth {
  const modeled = links.filter((l) => l.depth === "modeled").length;
  if (modeled === 0) return "strong";
  if (modeled === 1) return "moderate";
  return "thin";
}

function buildBuy(ch: PlannedChannel): RecommendationBuy {
  if (ch.outlets.length > 0) return { kind: "outlets", outlets: ch.outlets };
  return { kind: "channel_target", target: CHANNEL_LABELS[ch.channel] };
}

function headlineFor(ch: PlannedChannel, market: string, whiteSpace: RecommendationLink): string {
  const label = CHANNEL_LABELS[ch.channel];
  const open = whiteSpace.depth === "modeled" || whiteSpace.value === "none observed";
  return open ? `Claim ${label} in ${market}` : `Win share on ${label} in ${market}`;
}

/* ── The assembler ──────────────────────────────────────────────────────── */

/**
 * Build the deck's recommendations from the channel plan + layer summaries.
 * Channels are taken in the planner's opportunity order (whitespace-weighted).
 * A channel whose Opportunity or Fit link can't be filled from real data drops
 * to the watch-list; White space is always fillable (measured or modeled).
 */
export function buildRecommendations(
  plan: ChannelPlan,
  opportunity: OpportunitySummary,
  measured: MeasuredChannel[],
  options: { maxRecommendations?: number } = {},
): RecommendationResult {
  const max = options.maxRecommendations ?? DEFAULT_MAX_RECOMMENDATIONS;
  const measuredByChannel = new Map(measured.map((m) => [m.channel, m]));

  // The market opportunity link is shared across recs (it's the market signal).
  const opportunityLink = buildOpportunityLink(opportunity);

  // Flatten the plan in funnel order, then rank by whitespace-weighted opportunity.
  const ordered: PlannedChannel[] = (["awareness", "consideration", "conversion"] as const)
    .flatMap((stage) => plan.stages[stage])
    .slice()
    .sort((a, b) => b.opportunity - a.opportunity);

  const recommendations: Recommendation[] = [];
  const watch_list: WatchItem[] = [];

  for (const ch of ordered) {
    // Gate: no market crash exposure → nothing is a recommendation here.
    if (!opportunityLink) {
      watch_list.push({ channel: ch.channel, reason: "No crash-exposure signal for this market yet." });
      continue;
    }
    // Fit is required on a PlannedChannel; guard defensively anyway.
    if (ch.fit == null || Number.isNaN(ch.fit)) {
      watch_list.push({ channel: ch.channel, reason: "No audience-fit signal for this channel yet." });
      continue;
    }

    const whiteSpaceLink = buildWhiteSpaceLink(ch.channel, measuredByChannel);
    const fitLink = buildFitLink(ch);
    const links = [opportunityLink, whiteSpaceLink, fitLink];

    if (recommendations.length < max) {
      recommendations.push({
        channel: ch.channel,
        headline: headlineFor(ch, opportunity.market_label, whiteSpaceLink),
        opportunity: opportunityLink,
        white_space: whiteSpaceLink,
        fit: fitLink,
        proof: [
          { value: opportunityLink.value, source: opportunityLink.source },
          { value: whiteSpaceLink.value, source: whiteSpaceLink.source },
          { value: fitLink.value, source: fitLink.source },
        ],
        buy: buildBuy(ch),
        data_depth: deriveDataDepth(links),
      });
    }
    // Channels beyond the cap are simply not surfaced (not watch-listed — the
    // watch-list is for missing data, not for ranking below the top N).
  }

  return { recommendations, watch_list };
}
