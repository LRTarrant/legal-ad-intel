/**
 * PI Templates Registry
 *
 * Central lookup map from PI category enum value to its template.
 * The script generator routes use getPITemplate() to fetch the right
 * template based on the campaign's pi_category column.
 *
 * To add a new PI category:
 *   1. Add the enum value to PICategory in types.ts AND the CHECK
 *      constraint in the campaigns table migration
 *   2. Create a new template file (e.g. dog_bite.ts)
 *   3. Import it here and add to PI_TEMPLATES
 *   4. Add tests covering hook variable substitution
 */

import { bicycleAccidentTemplate } from "./bicycle_accident";
import { boatingAccidentTemplate } from "./boating_accident";
import { carAccidentTemplate } from "./car_accident";
import { dogBiteTemplate } from "./dog_bite";
import { motorcycleAccidentTemplate } from "./motorcycle_accident";
import { pedestrianAccidentTemplate } from "./pedestrian_accident";
import { premisesLiabilityTemplate } from "./premises_liability";
import { slipAndFallTemplate } from "./slip_and_fall";
import { truckAccidentTemplate } from "./truck_accident";
import type { PICategory, PITemplate } from "./types";

export type { PICategory, PITemplate, PITemplateVars, SeverityModifier } from "./types";
export { renderPITemplate, renderTemplate } from "./types";

/**
 * Map of all v1 PI category templates.
 *
 * Tasks 2 + 3 shipped motorcycle, boating, and car (seasonal priority).
 * Task 10 (this file's most recent change) adds the remaining 6:
 * truck, slip & fall, dog bite, premises liability, pedestrian, bicycle.
 *
 * All 9 v1 PI categories now have registered templates. Rideshare
 * remains deferred to v2 per SPEC §8.
 */
export const PI_TEMPLATES: Partial<Record<PICategory, PITemplate>> = {
  car_accident: carAccidentTemplate,
  truck_accident: truckAccidentTemplate,
  motorcycle_accident: motorcycleAccidentTemplate,
  boating_accident: boatingAccidentTemplate,
  slip_and_fall: slipAndFallTemplate,
  dog_bite: dogBiteTemplate,
  premises_liability: premisesLiabilityTemplate,
  pedestrian_accident: pedestrianAccidentTemplate,
  bicycle_accident: bicycleAccidentTemplate,
};

/**
 * Look up a PI template by category. Returns undefined if the category
 * doesn't have a template registered yet (e.g. truck_accident in v1
 * before Task 9 ships).
 *
 * Callers should treat undefined as "not yet implemented" and either:
 *   - Show a "coming soon" UI state, OR
 *   - Fall back to a generic template, OR
 *   - Surface an error explaining the category isn't yet available
 *
 * The DB allows all 9 categories to be saved on campaigns (the CHECK
 * constraint is broader than the template registry on purpose) so
 * users can save a draft now and re-render once the template ships.
 */
export function getPITemplate(category: PICategory): PITemplate | undefined {
  return PI_TEMPLATES[category];
}

/**
 * List all PI categories that have a registered template.
 * Used by the UI to render category dropdowns showing only what works.
 */
export function getAvailablePICategories(): PICategory[] {
  return Object.keys(PI_TEMPLATES) as PICategory[];
}
