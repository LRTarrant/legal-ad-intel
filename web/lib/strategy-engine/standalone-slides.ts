/**
 * Strategy Engine (standalone) — Strategy → SlideSpec[] for PPTX export.
 *
 * Maps the contract Strategy object to the proposal-builder SlideSpec contract,
 * so the PPTX export reuses the same pptxgenjs deck writer (native charts,
 * Vercel-safe). Mirrors lib/strategy-engine/slides.ts (the state-page engine).
 * PURE — no Supabase / React / Next.
 */

import type { SlideSpec } from "@/lib/proposal-builder/slide-spec";
import type { Strategy } from "./standalone";

function pretty(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function farsWindow(s: Strategy): string {
  return s.opportunity.fars_year_min && s.opportunity.fars_year_max
    ? `${s.opportunity.fars_year_min}–${s.opportunity.fars_year_max}`
    : "recent years";
}

function leadLabel(m: string): string {
  return m === "truck" ? "truck-involved fatal crashes" : m === "motorcycle" ? "motorcycle fatalities" : "traffic fatalities";
}

export function standaloneStrategyToSlides(s: Strategy): SlideSpec[] {
  const slides: SlideSpec[] = [];
  const caseLabel = pretty((s.case_types ?? []).join(", "));

  // 1. Cover
  slides.push({
    kicker: "Marketing Intelligence Strategy",
    heading: `${s.market.label} Marketing Strategy`,
    subheading: `${caseLabel} · ${pretty(s.confidence)} confidence`,
    bullets: [s.prose?.market_read].filter(Boolean) as string[],
    footnote: "Built on FARS crash data, competitive ad intelligence, Census demographics, and market media data.",
  });

  // 2. The brief
  slides.push({
    kicker: "Inputs",
    heading: "The brief, restated",
    stats: [
      { label: "Audience", value: pretty(s.audience) },
      { label: "Case types", value: caseLabel },
      { label: "Market", value: s.market.label },
      { label: "Budget tier", value: pretty(s.budget_tier ?? "—") },
      { label: "Goal", value: s.goal ?? "—" },
      { label: "Confidence", value: pretty(s.confidence) },
    ],
  });

  // 3. Where to play (county opportunity)
  const counties = (s.opportunity.counties ?? []).slice(0, 8);
  slides.push({
    kicker: "Opportunity",
    heading: "Where to play",
    subheading: `${pretty(leadLabel(s.opportunity.lead_metric))} vs reachable demand, by county`,
    chart: {
      type: "bar",
      series: [{ name: pretty(leadLabel(s.opportunity.lead_metric)), labels: counties.map((c) => c.county_name), values: counties.map((c) => c.truck_fatalities || c.total_fatalities || 0) }],
      caption: `FARS ${farsWindow(s)} · Census reachability`,
    },
    footnote: "FARS fatalities are a severity proxy, not total injury crashes; multi-year window.",
  });

  // 4. The competitive field
  slides.push({
    kicker: "Competitive landscape",
    heading: "The competitive field",
    subheading: "Who's advertising in the market, ranked by sustained presence (market breadth + recent activity)",
    table: {
      columns: ["Firm", "Presence share"],
      rows: (s.competitive.advertisers ?? []).slice(0, 6).map((a) => [`${a.rank}. ${a.name}`, `${Math.round(a.share * 100)}%`]),
    },
    footnote: "Presence share weights sustained presence (geographic breadth, then recent activity) — the same ranking as the Competitive Analysis tab. No estimated dollar spend — per-firm spend isn't reliably sourceable for local PI.",
  });

  // 4b. Inside their ads (real competitor creative) — only if we have samples.
  const creatives = s.competitive.creative ?? [];
  if (creatives.length > 0) {
    slides.push({
      kicker: "Ad intelligence",
      heading: "Inside their ads",
      subheading: "A sample of real creative from tracked competitors",
      table: {
        columns: ["Firm", "Channel", "Headline"],
        rows: creatives.slice(0, 8).map((c) => [
          c.advertiser ?? c.advertiser_domain ?? "—",
          c.format_label,
          c.headline ?? (c.channel === "youtube" ? "Video ad (thumbnail in the live deck)" : "—"),
        ]),
      },
      footnote: "Real captured creative — roster-scoped YouTube video ads + live paid-search headlines.",
    });
  }

  // 5. Where the white space is
  slides.push({
    kicker: "Competitive landscape",
    heading: "Where the white space is",
    table: {
      columns: ["Channel", "Status", "Firms"],
      rows: (s.competitive.channels ?? []).map((c) => [`${c.label}${c.measured ? "" : " (modeled)"}`, pretty(c.status), String(c.active_firms)]),
    },
    footnote: "Untracked channels: presence modeled from ad-library coverage.",
  });

  // 6. Recommendations divider
  slides.push({
    kicker: "The product",
    heading: "The recommendations",
    bullets: ["Each defensible to the number — opportunity, white space, fit."],
  });

  // 7-9. Each recommendation
  (s.recommendations ?? []).forEach((r, i) => {
    const buy = r.buy?.kind === "outlets" ? (r.buy.outlets ?? []).map((o) => o.name).join(", ") : r.buy?.target;
    slides.push({
      kicker: `Recommendation ${String(i + 1).padStart(2, "0")} · ${pretty(r.data_depth)} data`,
      heading: r.headline,
      stats: [
        { label: "Opportunity", value: r.opportunity.value },
        { label: "White space", value: r.white_space.value },
        { label: "Fit", value: r.fit.value },
      ],
      bullets: [
        r.opportunity.text,
        r.white_space.text,
        r.fit.text,
        buy ? `The buy: ${buy}` : "",
      ].filter(Boolean) as string[],
      footnote: (r.proof ?? []).map((p) => `${p.value} — ${p.source}`).join("  ·  "),
    });
  });

  // 10. Integrated plan
  const alloc = s.integrated_plan?.allocation ?? [];
  slides.push({
    kicker: "Integrated plan",
    heading: "The budget, by channel and funnel stage",
    subheading: `${pretty(s.integrated_plan?.cadence ?? "")} · ${pretty(s.integrated_plan?.funnel_emphasis ?? "")}`,
    chart: {
      type: "bar",
      series: [{ name: "Budget %", labels: alloc.map((a) => a.label), values: alloc.map((a) => a.pct) }],
    },
    bullets: [s.prose?.channel_narrative].filter(Boolean) as string[],
  });

  // 10b. Before you spend a dollar (readiness) — only when there are items.
  const readiness = s.readiness ?? [];
  if (readiness.length > 0) {
    slides.push({
      kicker: "Before you spend a dollar",
      heading: "Foundation check",
      table: {
        columns: ["Foundation item", "Status", "Needed for"],
        rows: readiness.map((r) => [r.label, r.status === "missing" ? "Fix first" : "Confirm", r.tactics.join(", ")]),
      },
      footnote: "A media plan is only as strong as the funnel it points at — close these before scaling spend.",
    });
  }

  // 11. Handoff
  slides.push({
    kicker: "Handoff",
    heading: "Turn this strategy into a campaign",
    bullets: [s.prose?.approach_rationale].filter(Boolean) as string[],
    footnote: "Continue in the LMI Campaign Builder to generate creative + CSV exports.",
  });

  return slides;
}

export function standaloneStrategyFilename(s: Strategy): string {
  const slug = `${s.market.label}-${(s.case_types ?? []).join("-")}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${slug || "strategy"}-media-strategy.pptx`;
}
