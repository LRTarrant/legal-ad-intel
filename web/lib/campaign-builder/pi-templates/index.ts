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

import { boatingAccidentTemplate } from "./boating_accident";
import { carAccidentTemplate } from "./car_accident";
import { motorcycleAccidentTemplate } from "./motorcycle_accident";
import type { PICategory, PITemplate } from "./types";

export type { PICategory, PITemplate, PITemplateVars, SeverityModifier } from "./types";
export { renderPITemplate, renderTemplate } from "./types";

/**
 * Map of all v1 PI category templates.
 *
 * v1 ships with 3 categories (motorcycle, boating, car) — seasonal priority.
 * Remaining 6 (truck, slip_and_fall, dog_bite, premises_liability,
 * pedestrian_accident, bicycle_accident) ship in Task 9.
 */
export const PI_TEMPLATES: Partial<Record<PICategory, PITemplate>> = {
  car_accident: carAccidentTemplate,
  motorcycle_accident: motorcycleAccidentTemplate,
  boating_accident: boatingAccidentTemplate,
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
