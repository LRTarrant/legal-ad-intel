/**
 * Live FAERS signals for the Dupixent tort page (cutaneous T-cell lymphoma).
 *
 * Config only - the machinery lives in faers-shared.ts.
 *
 * The Dupixent page runs in "lawyer" concentration mode. Dupixent (dupilumab)
 * has no single dominant injury in FAERS: the largest reaction clusters by
 * volume are ocular-surface disease (~1,608 reports) and joint/arthritis
 * (~1,604), but both are 0.0% lawyer-filed - on-label ADRs with no litigation
 * footprint. Cutaneous T-cell lymphoma is smaller (198 qualifying reports) but
 * is the only Dupixent cluster with real plaintiff-firm FAERS activity:
 * verified against the live dataset (2026-03-31), the tight CTCL spectrum is
 * 5.56% lawyer-sourced - 7.6x the 0.73% dataset baseline - and 4.5% fatal.
 * The litigation theory is dupilumab unmasking / accelerating a CTCL that was
 * misdiagnosed and treated as atopic dermatitis. The consumer-share signal is
 * quiet here (cluster consumer share ~23.6%, below the 36.6% baseline), so
 * "consumer" mode would invert; the lawyer share is the live signal. See
 * ConcentrationMode in faers-shared.ts.
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
 * Exact `medicinalproduct` strings for Dupixent. Two strings: the brand
 * "DUPIXENT" (29,570 drug rows / 21,599 reports) and the INN "DUPILUMAB"
 * (3,423 / 2,363).
 *
 * Including the generic INN is a deliberate departure from the GLP-1 and
 * Depo-Provera configs, which excluded bare generic strings as brand-
 * ambiguous. Dupilumab is a single-source biologic: it has no generic
 * competitor and only one brand worldwide, so "DUPILUMAB" maps 1:1 to
 * Dupixent with no attribution ambiguity. Bare "SEMAGLUTIDE" / bare
 * "MEDROXYPROGESTERONE" were ambiguous; "DUPILUMAB" is not.
 *
 * Long-tail pen/syringe variants ("DUPIXENT PEN (2-PK)", "DUPIXENT SYR",
 * etc.) are excluded: ~12 reports combined, below the noise floor.
 */
export const DUPIXENT_BRAND_MAP: Record<string, string[]> = {
  Dupixent: ["DUPIXENT", "DUPILUMAB"],
};

/**
 * Cutaneous T-cell lymphoma MedDRA preferred terms. FAERS codes the
 * Dupixent CTCL reports as "Cutaneous T-cell lymphoma" (and staged variants),
 * NOT under the clinical names "Mycosis fungoides" or "Sezary syndrome" -
 * neither PT appears for Dupixent in the dataset at all. Same "canonical PT
 * is not the layperson/clinical name" lesson as the GLP-1 torts.
 *
 * The list is the CTCL spectrum: cutaneous T-cell lymphoma and its stage
 * variants, bare T-cell lymphoma (a T-cell lymphoma in an atopic-dermatitis
 * patient is cutaneous in context), Cutaneous lymphoma, and Lymphomatoid
 * papulosis (a CD30+ primary-cutaneous lymphoproliferative disorder in the
 * CTCL umbrella).
 *
 * Deliberately excluded: bare "Lymphoma" (71 reports, verified 0.0% lawyer -
 * carries no litigation signal and is B-cell-ambiguous), all B-cell terms
 * ("B-cell lymphoma", "Diffuse large B-cell lymphoma", "Mantle cell
 * lymphoma", "Burkitt^s lymphoma", "Extranodal marginal zone B-cell
 * lymphoma"), "Non-Hodgkin^s lymphoma" and its staged variants, nodal T-cell
 * lymphomas that are not cutaneous ("Angioimmunoblastic T-cell lymphoma",
 * "Adult T-cell lymphoma/leukaemia", "Precursor T-lymphoblastic
 * lymphoma/leukaemia"), and "Pseudolymphoma" (benign). Same single-injury
 * attribution discipline the GLP-1 and Depo-Provera configs applied.
 */
export const CTCL_REACTION_PTS = [
  "Cutaneous T-cell lymphoma",
  "Cutaneous T-cell lymphoma stage I",
  "Cutaneous T-cell lymphoma stage II",
  "Cutaneous T-cell lymphoma stage III",
  "Cutaneous T-cell lymphoma stage IV",
  "T-cell lymphoma",
  "T-cell lymphoma stage IV",
  "T-cell lymphoma recurrent",
  "Cutaneous lymphoma",
  "Lymphomatoid papulosis",
];

/* ------------------------------------------------------------------ */
/*  Public entry point                                                  */
/* ------------------------------------------------------------------ */

/**
 * Fetch the three live FAERS signals for the Dupixent tort page. Never
 * throws - on failure returns an empty, `hasData: false` structure so the
 * page degrades gracefully.
 */
export async function getFaersDupixentSignals(): Promise<FaersSignals> {
  return getFaersSignals({
    cacheKey: "dupixent",
    brandMap: DUPIXENT_BRAND_MAP,
    reactionPts: CTCL_REACTION_PTS,
    baselinePct: FAERS_LAWYER_BASELINE_PCT,
  });
}
