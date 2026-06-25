/**
 * Strategy Engine — deck mapper.
 *
 * Projects a generated strategy (deterministic plan + AI prose) into the
 * existing proposal-builder SlideSpec contract, so the PPTX export reuses
 * `buildProposalPptx` (native pptxgenjs charts, Vercel-safe) with zero new
 * rendering code.
 *
 * `import type` keeps this module runtime-dependency-free (it stays pure and
 * `node --test` runnable; the type is erased at build/run).
 */

import type { SlideSpec } from "@/lib/proposal-builder/slide-spec";
import { ARCHETYPE_LABELS } from "./types";
import type { FunnelStage, GeneratedStrategy, StrategyPlan } from "./types";
import { confidenceLabel } from "./prompt";

const STAGE_LABEL: Record<FunnelStage, string> = {
  awareness: "Awareness",
  consideration: "Consideration",
  conversion: "Conversion",
};

const SOURCES_FOOTNOTE =
  "Sources: LMI ad-activity observations, U.S. Census ACS, NHTSA FARS, FCC station data. Directional — figures are relative indices and rates, not measured reach.";

export function strategyToSlides(strategy: GeneratedStrategy): SlideSpec[] {
  const { plan, prose } = strategy;
  const archetypeLabel = ARCHETYPE_LABELS[plan.archetype.key];
  const slides: SlideSpec[] = [];

  // 1. Cover ----------------------------------------------------------------
  slides.push({
    kicker: "Media Strategy",
    heading: `${plan.state_name} ${plan.tort_label}`,
    subheading: `${archetypeLabel} · ${confidenceLabel(plan.confidence)}`,
    bullets: [prose.market_read],
    footnote: SOURCES_FOOTNOTE,
  });

  // 2. The approach ---------------------------------------------------------
  const approachBullets = [prose.approach_rationale];
  approachBullets.push(`Why this fits: ${plan.archetype.why_this_fits}`);
  approachBullets.push(`Why not the alternatives: ${plan.archetype.why_not_alternatives}`);
  if (plan.gorilla.present && plan.gorilla.reason) {
    approachBullets.push(`Market note: ${plan.gorilla.reason}`);
  }
  slides.push({
    kicker: "The Approach",
    heading: archetypeLabel,
    stats: [
      { label: "Cadence", value: plan.channel_plan.cadence === "always_on" ? "Always-On" : "Surge" },
      { label: "Emphasis", value: plan.channel_plan.funnel === "brand_led" ? "Brand-led" : "Conversion-led" },
      { label: "Confidence", value: confidenceLabel(plan.confidence) },
    ],
    bullets: approachBullets,
    footnote: SOURCES_FOOTNOTE,
  });

  // 3. Channel sequence (with an opportunity chart) -------------------------
  const stageOrder: FunnelStage[] = ["awareness", "consideration", "conversion"];
  const chartLabels: string[] = [];
  const chartValues: number[] = [];
  const channelBullets: string[] = [];
  for (const stage of stageOrder) {
    const channels = plan.channel_plan.stages[stage];
    if (channels.length === 0) continue;
    channelBullets.push(`${STAGE_LABEL[stage]}:`);
    for (const c of channels) {
      channelBullets.push(c.rationale);
      chartLabels.push(c.label);
      chartValues.push(Math.round(c.opportunity * 100));
    }
  }
  slides.push({
    kicker: "Channel Sequence",
    heading: "Awareness → Consideration → Conversion",
    bullets: channelBullets.length > 0 ? [prose.channel_narrative, ...channelBullets] : [prose.channel_narrative],
    chart:
      chartLabels.length > 0
        ? {
            type: "bar",
            series: [{ name: "Opportunity index", labels: chartLabels, values: chartValues }],
            caption: "Whitespace-weighted opportunity = audience fit × open competition (relative index, 0–100).",
          }
        : undefined,
    footnote: SOURCES_FOOTNOTE,
  });

  // 4. County → DMA translation --------------------------------------------
  const links = plan.channel_plan.county_dma_translation.slice(0, 8);
  if (links.length > 0) {
    slides.push({
      kicker: "Geography",
      heading: "Your counties, the media markets that reach them",
      subheading: "Media is bought at the DMA level; here's how your case geography maps.",
      table: {
        columns: ["County", "Media market (DMA)"],
        rows: links.map((l) => [l.county_name, l.dma_name]),
      },
      footnote: SOURCES_FOOTNOTE,
    });
  }

  // 5. First moves ----------------------------------------------------------
  slides.push({
    kicker: "First Moves",
    heading: "Start here in the next 7 days",
    bullets: plan.first_moves.map((m, i) => `${i + 1}. ${m.action} — "${m.outreach_question}"`),
    footnote: SOURCES_FOOTNOTE,
  });

  return slides;
}

/** Suggested download filename for the deck. */
export function strategyDeckFilename(plan: StrategyPlan): string {
  const slug = `${plan.state_abbr}-${plan.tort_label}-${ARCHETYPE_LABELS[plan.archetype.key]}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `lmi-strategy-${slug}.pptx`;
}
