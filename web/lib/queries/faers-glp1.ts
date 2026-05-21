/**
 * Live FAERS signals for the GLP-1 tort pages (gastroparesis & vision-loss).
 *
 * This file is now just the GLP-1 *config*: the brand map, the per-page
 * MedDRA preferred-term lists, and a thin `getFaersGlp1Signals` wrapper. All
 * the machinery (types, shaping, the cached RPC fetch) lives in faers-shared.ts
 * and is shared with the other tort pages.
 *
 * The GLP-1 pages run in "consumer" concentration mode: GLP-1 NAION /
 * gastroparesis litigation is pre-/early-MDL, so claimant intake routes
 * through manufacturers and stays consumer-tagged. See ConcentrationMode in
 * faers-shared.ts for the consumer-vs-lawyer framing.
 */

import {
  FAERS_CONSUMER_BASELINE_PCT,
  getFaersSignals,
  type FaersSignals,
} from "./faers-shared";

/* Re-exported so existing deep imports (`@/lib/queries/faers-glp1`) keep
 * working. `FaersGlp1Signals` is an alias of the tort-agnostic `FaersSignals`. */
export type {
  FaersSignals as FaersGlp1Signals,
  FaersDrugSignal,
  FaersReaction,
  FaersTrendPoint,
  FaersTrendDirection,
} from "./faers-shared";
export { FAERS_CONSUMER_BASELINE_PCT } from "./faers-shared";

/* ------------------------------------------------------------------ */
/*  Constants - data-shape facts (see PR-4 notes for derivation)        */
/* ------------------------------------------------------------------ */

export const GLP1_BRANDS = [
  "Ozempic",
  "Wegovy",
  "Rybelsus",
  "Mounjaro",
  "Zepbound",
] as const;

export type Glp1Brand = (typeof GLP1_BRANDS)[number];

/**
 * Exact `medicinalproduct` strings per brand. Bare uppercase brand names
 * dominate (>99% of each brand's volume). Bare "SEMAGLUTIDE" / "TIRZEPATIDE"
 * are deliberately excluded - generic-only reports cannot be attributed to a
 * single brand. Long-tail dosage/format variants ("OZEMPIC INJ 2MG/3ML" etc.)
 * are excluded (<1% of volume); documented in the on-page methodology note.
 */
export const GLP1_BRAND_MAP: Record<Glp1Brand, string[]> = {
  Ozempic: ["OZEMPIC"],
  Wegovy: ["WEGOVY"],
  Rybelsus: ["RYBELSUS"],
  Mounjaro: ["MOUNJARO"],
  Zepbound: ["ZEPBOUND"],
};

/**
 * Gastroparesis-spectrum MedDRA preferred terms. The dataset has NO literal
 * "Gastroparesis" PT - its canonical term is "Impaired gastric emptying".
 * Obstruction / ileus PTs are the gastroparesis-spectrum injuries named in
 * MDL 3094.
 */
export const GASTROPARESIS_REACTION_PTS = [
  "Impaired gastric emptying",
  "Intestinal obstruction",
  "Ileus",
  "Small intestinal obstruction",
  "Ileus paralytic",
  "Large intestinal obstruction",
  "Gastrointestinal obstruction",
  "Diabetic gastroparesis",
  "Distal intestinal obstruction syndrome",
];

/**
 * NAION / optic-neuropathy / vision-loss MedDRA preferred terms. The dataset
 * has NO literal "NAION" PT - "Optic ischaemic neuropathy" is the closest
 * preferred term and the core MDL 3163 injury. Non-ischemic ocular-surface
 * terms (Eye pain, Dry eye, etc.) and `%papill%` false positives (Papillary
 * thyroid cancer) are deliberately excluded.
 */
export const VISION_LOSS_REACTION_PTS = [
  "Optic ischaemic neuropathy",
  "Visual impairment",
  "Vision blurred",
  "Blindness",
  "Blindness unilateral",
  "Optic neuritis",
  "Blindness transient",
  "Visual field defect",
  "Papilloedema",
  "Visual acuity reduced",
  "Optic nerve disorder",
  "Optic neuropathy",
  "Ocular stroke",
  "Optic atrophy",
  "Optic nerve injury",
  "Optic disc oedema",
  "Amaurosis fugax",
  "Tunnel vision",
  "Eye infarction",
  "Optic disc haemorrhage",
];

export type FaersPage = "gastroparesis" | "vision_loss";

/* ------------------------------------------------------------------ */
/*  Public entry point                                                  */
/* ------------------------------------------------------------------ */

/**
 * Fetch the three live FAERS signals for a GLP-1 tort page. Never throws -
 * on failure returns an empty, `hasData: false` structure so the page
 * degrades gracefully.
 */
export async function getFaersGlp1Signals(
  page: FaersPage,
): Promise<FaersSignals> {
  return getFaersSignals({
    cacheKey: page === "gastroparesis" ? "glp1-gastroparesis" : "glp1-vision-loss",
    brandMap: GLP1_BRAND_MAP,
    reactionPts:
      page === "gastroparesis"
        ? GASTROPARESIS_REACTION_PTS
        : VISION_LOSS_REACTION_PTS,
    baselinePct: FAERS_CONSUMER_BASELINE_PCT,
  });
}
