/**
 * Practice Area Router
 *
 * Routes script generation between Mass Tort and Personal Injury paths
 * based on a campaign's `practice_area` column.
 *
 * Why a router (instead of branching inside each generate-* route):
 *   - Mass tort flow is well-established and pulls from torts/benchmarks
 *   - PI flow is new and pulls from PI templates + DMA market data
 *   - Keeping the branch at one entry point makes it easy to add a third
 *     practice area later (workers' comp, med mal) without touching
 *     every generate-* route.
 *
 * Existing routes (e.g. generate-radio-script, generate-video-script)
 * call this router to get a typed prompt context, then assemble the
 * final LLM prompt around it.
 *
 * See: campaign_builder_pi_handoff/SPEC.md Section 2.1.
 */

import type { PITemplate, PITemplateVars, SeverityModifier } from "./pi-templates";
import { getPITemplate, renderPITemplate } from "./pi-templates";

/**
 * Practice area discriminator — must match the CHECK constraint on
 * campaigns.practice_area.
 */
export type PracticeArea = "mass_tort" | "personal_injury";

/**
 * Input from the campaign config (or a draft request before save).
 * Mirrors the shape of a row in the campaigns table, but with optional
 * fields that are filled in based on practice_area.
 */
export interface CampaignContext {
  practice_area: PracticeArea;

  // Mass tort fields
  tort_slug?: string;

  // PI fields
  pi_category?: string;
  market_display_name?: string;
  market_dma_code?: string;

  // Shared
  state?: string;
  state_full_name?: string;
  firm_name?: string;
  severity_modifiers?: string[];
}

/**
 * The output of the router — a typed payload that downstream script
 * routes consume to build their LLM prompt.
 *
 * Mass tort path: returns a TortPromptContext (existing behavior, NOT
 * implemented here yet — current generate-* routes already handle
 * mass tort directly. This router will be used by NEW PI flows first;
 * mass tort migration is a v2 cleanup task.)
 *
 * PI path: returns a rendered PITemplate plus active severity modifiers
 * the consumer should apply (severity-modifiers/* layer).
 */
export type RouterResult =
  | {
      practice_area: "mass_tort";
      // Placeholder for now — Task 5 will fully wire this up.
      // For v1, mass tort routes continue using their existing
      // tort_name/tort_slug-driven flow without going through the router.
      tort_slug: string;
    }
  | {
      practice_area: "personal_injury";
      template: PITemplate;
      severity_modifiers: SeverityModifier[];
    };

/**
 * Resolve a CampaignContext to a RouterResult.
 *
 * Throws if required fields are missing — surfaces config bugs early
 * rather than producing a silently malformed script.
 */
export function routePracticeArea(ctx: CampaignContext): RouterResult {
  if (ctx.practice_area === "mass_tort") {
    if (!ctx.tort_slug) {
      throw new Error("mass_tort campaign requires tort_slug");
    }
    return { practice_area: "mass_tort", tort_slug: ctx.tort_slug };
  }

  if (ctx.practice_area === "personal_injury") {
    if (!ctx.pi_category) {
      throw new Error("personal_injury campaign requires pi_category");
    }
    if (!ctx.market_display_name) {
      throw new Error(
        "personal_injury campaign requires market_display_name (DMA colloquial name)",
      );
    }

    const template = getPITemplate(ctx.pi_category as never);
    if (!template) {
      throw new Error(
        `No PI template registered for category "${ctx.pi_category}". ` +
          `This category exists in the DB enum but a template hasn't shipped yet. ` +
          `Add it to web/lib/campaign-builder/pi-templates/ to enable.`,
      );
    }

    const vars: PITemplateVars = {
      market_display_name: ctx.market_display_name,
      state: ctx.state_full_name ?? ctx.state ?? "",
      firm_name: ctx.firm_name ?? "Our firm",
    };

    return {
      practice_area: "personal_injury",
      template: renderPITemplate(template, vars),
      severity_modifiers:
        (ctx.severity_modifiers ?? []).filter(
          (m): m is SeverityModifier => m === "fatal" || m === "catastrophic",
        ),
    };
  }

  // Exhaustiveness check
  const _exhaustive: never = ctx.practice_area;
  throw new Error(`Unknown practice_area: ${_exhaustive}`);
}
