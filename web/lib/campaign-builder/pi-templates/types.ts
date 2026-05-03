/**
 * PI (Personal Injury) Campaign Template Types
 *
 * Shared types for Personal Injury script generation templates.
 * Each PI category (car, truck, motorcycle, etc.) exports a PITemplate
 * that the script generator routes to based on `pi_category` enum.
 *
 * See: campaign_builder_pi_handoff/SPEC.md Section 2 for the full design.
 */

/**
 * PI category enum values — match the CHECK constraint in
 * supabase/migrations/20260504000002_create_campaigns_table.sql.
 *
 * v1 categories. Rideshare deferred to v2.
 * Wrongful death is handled as a severity modifier, not a category.
 */
export type PICategory =
  | "car_accident"
  | "truck_accident"
  | "motorcycle_accident"
  | "boating_accident"
  | "slip_and_fall"
  | "dog_bite"
  | "premises_liability"
  | "pedestrian_accident"
  | "bicycle_accident";

/**
 * Severity modifiers — match the CHECK constraint in the campaigns table.
 * Mutually exclusive (DB-enforced). Layered onto the base template
 * after generation; see severity-modifiers/* for the layer logic.
 */
export type SeverityModifier = "fatal" | "catastrophic";

/**
 * Variables substituted into template strings at render time.
 *
 * Naming: snake_case to match how they appear in the campaigns table
 * and the generated SQL columns (consistency across DB / API / templates).
 */
export interface PITemplateVars {
  /** Colloquial DMA name — e.g. "Birmingham". NEVER use full_name or dma_code here. */
  market_display_name: string;
  /** Full state name from STATE_NAMES — e.g. "Alabama". */
  state: string;
  /** User's firm name — comes from campaign config. */
  firm_name: string;
}

/**
 * The shape of a PI category template. Each section is a string that may
 * contain {var_name} placeholders to be substituted at render time.
 *
 * Structure mirrors the spec (Section 2.2):
 *   HOOK → PROBLEM → AUTHORITY → (optional SOCIAL_PROOF) → CTA → DISCLAIMER
 *
 * The state compliance layer (Task 9) appends additional disclaimer text
 * based on the state.
 */
export interface PITemplate {
  /** PI category enum value this template applies to. */
  category: PICategory;

  /** Human-readable name for logs and admin UI. */
  displayName: string;

  /** First 3 seconds — pattern interrupt or attention grab. */
  hook: string;

  /** Pain point or situation — what's wrong / what they're facing. */
  problem: string;

  /** Why this firm — credibility, jurisdiction, expertise. */
  authority: string;

  /** Optional results / volume language. Many states restrict this. */
  socialProof?: string;

  /** Call to action. */
  cta: string;

  /** Base disclaimer; state compliance layer adds more. */
  baseDisclaimer: string;

  /**
   * Tone hint passed to the LLM prompt builder. Lets the radio/video
   * script routes adjust voice and pacing per category without each
   * route hardcoding category-specific logic.
   */
  toneHint: string;
}

/**
 * Substitute {var_name} placeholders in a template string with values
 * from PITemplateVars.
 *
 * Example:
 *   render("Hi {firm_name} in {market_display_name}", {
 *     firm_name: "Acme Law", market_display_name: "Birmingham", state: "Alabama"
 *   })
 *   → "Hi Acme Law in Birmingham"
 *
 * Throws if a {var_name} in the template is not present in vars — this
 * catches typos at render time rather than producing a malformed script.
 */
export function renderTemplate(
  template: string,
  vars: PITemplateVars,
): string {
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => {
    if (!(key in vars)) {
      throw new Error(
        `PI template references unknown variable {${key}}. ` +
          `Allowed: ${Object.keys(vars).join(", ")}`,
      );
    }
    return vars[key as keyof PITemplateVars];
  });
}

/**
 * Render an entire PITemplate's text sections with the given vars.
 * Returns a new template object with all substitutions applied.
 */
export function renderPITemplate(
  template: PITemplate,
  vars: PITemplateVars,
): PITemplate {
  return {
    ...template,
    hook: renderTemplate(template.hook, vars),
    problem: renderTemplate(template.problem, vars),
    authority: renderTemplate(template.authority, vars),
    socialProof: template.socialProof
      ? renderTemplate(template.socialProof, vars)
      : undefined,
    cta: renderTemplate(template.cta, vars),
    baseDisclaimer: renderTemplate(template.baseDisclaimer, vars),
  };
}
