/**
 * Live FAERS signals for the Depo-Provera tort page (meningioma / MDL 3140).
 *
 * Config only - the machinery lives in faers-shared.ts.
 *
 * The Depo-Provera page runs in "lawyer" concentration mode. Unlike the
 * pre-MDL GLP-1 torts, Depo-Provera meningioma litigation is a mature MDL
 * (MDL 3140, N.D. Florida): plaintiff firms file FAERS reports DIRECTLY as
 * primarysource_qualification = 4 (lawyer). Verified against the live dataset
 * (2026-03-31): of 3,239 qualifying meningioma reports naming DEPO-PROVERA,
 * 95.2% are lawyer-sourced and only 4.1% consumer-sourced - so the GLP-1
 * "consumer share vs 36.6%" signal would invert (it would look quiet). The
 * litigation signal here is the lawyer share against the 0.73% dataset
 * baseline. See ConcentrationMode in faers-shared.ts.
 */

import {
  FAERS_LAWYER_BASELINE_PCT,
  getFaersSignals,
  type FaersSignals,
} from "./faers-shared";

/* ------------------------------------------------------------------ */
/*  Constants - data-shape facts (verified against the live dataset)    */
/* ------------------------------------------------------------------ */

/**
 * Exact `medicinalproduct` strings for Depo-Provera. Single brand, single
 * string: bare "DEPO-PROVERA" (4,129 drug rows / 3,742 distinct reports).
 *
 * Generic strings "MEDROXYPROGESTERONE ACETATE" and "MEDROXYPROGESTERONE" are
 * deliberately excluded: adding them lifts the qualifying-event count by only
 * ~72 net reports (+2.2%) because litigation reports co-name DEPO-PROVERA on
 * the same report, while introducing oral-vs-injectable route ambiguity (oral
 * MPA does not qualify for the tort). "PROVERA" is the oral tablet - a
 * different product - and is excluded. Same single-product-attribution
 * discipline PR-4 applied to bare "SEMAGLUTIDE".
 */
export const DEPO_BRAND_MAP: Record<string, string[]> = {
  "Depo-Provera": ["DEPO-PROVERA"],
};

/**
 * Meningioma MedDRA preferred terms. Unlike the GLP-1 torts (no literal
 * "Gastroparesis" / "NAION" PT), FAERS has a literal "Meningioma" PT and it
 * dominates the Depo-Provera reaction profile (2,785 reports; "Meningioma
 * benign" adds 415). The list is the meningioma spectrum - intracranial and
 * spinal, benign and malignant.
 *
 * Deliberately excluded: "Brain neoplasm" (38 - unspecified tumor, not
 * meningioma; the tort and the page's qualification copy are meningioma-
 * specific), "Glioma" / other tumor types, "Meningitis" / "Meningitis viral"
 * (infection - %meningi% false positives), generic "Neoplasm" / pituitary /
 * skull-base terms.
 */
export const MENINGIOMA_REACTION_PTS = [
  "Meningioma",
  "Meningioma benign",
  "Meningioma malignant",
  "Intracranial meningioma malignant",
  "Olfactory groove meningioma",
  "Intraosseous meningioma",
  "Spinal meningioma benign",
  "Optic nerve sheath meningioma",
];

/* ------------------------------------------------------------------ */
/*  Public entry point                                                  */
/* ------------------------------------------------------------------ */

/**
 * Fetch the three live FAERS signals for the Depo-Provera tort page. Never
 * throws - on failure returns an empty, `hasData: false` structure so the
 * page degrades gracefully.
 */
export async function getFaersDepoProveraSignals(): Promise<FaersSignals> {
  return getFaersSignals({
    cacheKey: "depo-provera",
    brandMap: DEPO_BRAND_MAP,
    reactionPts: MENINGIOMA_REACTION_PTS,
    baselinePct: FAERS_LAWYER_BASELINE_PCT,
  });
}
