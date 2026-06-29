/**
 * Strategy Engine — grounded-strategist orchestrator.
 *
 * Composes the pieces: build the prompt, call the (injected) model, parse,
 * validate grounding (retry once on failure), then enrich with code-owned
 * numbers — allocation %, reach/frequency targets, resolved outlets, and the
 * readiness gate. The model selects + writes; this owns every number and the
 * funnel sequencing. The model call is injected so this stays deterministic
 * and provider-agnostic.
 */
import type { NamedOutlet, Confidence, FunnelStage } from "./types";
import type { Tactic, Prerequisite } from "./tactics";
import type { TacticMenu } from "./tactic-scoring";
import { reachFrequencyTarget, computeAllocation, type ReachFrequencyTarget } from "./media-standards";
import { stripJSONWrapper } from "./prompt";
import { buildStrategistUserPrompt, STRATEGIST_SYSTEM_PROMPT, type StrategistPromptFacts } from "./strategist-prompt";
import { validateSelection, type GroundingFacts, type RawSelection } from "./strategist-grounding";

export interface ReadinessGap {
  prerequisite: Prerequisite;
  status: "missing" | "confirm";
  tactics: string[];
}
export interface MediaBrief {
  tactic: Tactic;
  rationale: string;
  format_call: string[];
  example_outlets: NamedOutlet[];
  reach_target: ReachFrequencyTarget | null;
  allocation_pct: number;
  affordable: boolean;
}
export interface StrategistOutput {
  briefs: MediaBrief[];
  narrative: string;
  readiness: ReadinessGap[];
  total_allocation_pct: number;
  confidence: Confidence;
  warnings: string[];
}

export type CallModel = (
  messages: Array<{ role: "system" | "user"; content: string }>,
) => Promise<string>;

export class GroundingError extends Error {
  errors: string[];
  constructor(errors: string[]) {
    super(`strategist grounding failed: ${errors.join("; ")}`);
    this.name = "GroundingError";
    this.errors = errors;
  }
}

const STAGE_ORDER: Record<FunnelStage, number> = { awareness: 0, consideration: 1, conversion: 2 };

export function computeReadiness(
  selected: Tactic[],
  foundation: Partial<Record<Prerequisite, boolean>>,
): ReadinessGap[] {
  const byPrereq = new Map<Prerequisite, { status: "missing" | "confirm"; tactics: string[] }>();
  for (const t of selected) {
    for (const p of t.prerequisites) {
      if (foundation[p] === true) continue; // satisfied
      const status: "missing" | "confirm" = foundation[p] === false ? "missing" : "confirm";
      const entry = byPrereq.get(p);
      if (entry) {
        entry.tactics.push(t.key);
        if (status === "missing") entry.status = "missing"; // missing dominates confirm
      } else {
        byPrereq.set(p, { status, tactics: [t.key] });
      }
    }
  }
  return [...byPrereq.entries()].map(([prerequisite, v]) => ({ prerequisite, ...v }));
}

function parseSelection(raw: string): RawSelection {
  return JSON.parse(stripJSONWrapper(raw)) as RawSelection;
}

/**
 * Builds the full enriched strategist output from a tactic menu + model call.
 *
 * Invariant: the lowercased names in `groundingFacts.outletNames` must match
 * the lowercased `.name` values in `outlets` — a name validated but absent
 * from `outlets` is silently dropped at resolution.
 */
export async function buildStrategistOutput(args: {
  menu: TacticMenu;
  promptFacts: StrategistPromptFacts;
  groundingFacts: GroundingFacts;
  outlets: NamedOutlet[];
  foundation: Partial<Record<Prerequisite, boolean>>;
  confidence: Confidence;
  callModel: CallModel;
  maxRetries?: number;
}): Promise<StrategistOutput> {
  const { menu, promptFacts, groundingFacts, outlets, foundation, confidence, callModel } = args;
  const maxRetries = args.maxRetries ?? 1;
  const userPrompt = buildStrategistUserPrompt(menu, promptFacts);

  let lastErrors: string[] = ["no model response"];
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const content = await callModel([
      { role: "system", content: STRATEGIST_SYSTEM_PROMPT },
      {
        role: "user",
        content:
          attempt === 0
            ? userPrompt
            : `${userPrompt}\n\nYour previous answer was rejected: ${lastErrors.join("; ")}. Fix every issue and return valid JSON.`,
      },
    ]);

    let raw: RawSelection;
    try {
      raw = parseSelection(content);
    } catch {
      lastErrors = ["model returned invalid JSON"];
      continue;
    }

    const validated = validateSelection(raw, menu, groundingFacts);
    if (!validated.ok) {
      lastErrors = validated.errors;
      continue;
    }

    // ── enrich with code-owned numbers ──────────────────────────────────────
    const byKey = new Map(menu.tactics.map((s) => [s.tactic.key, s]));
    const selectedKeys = validated.value.tactics.map((t) => t.key);
    const alloc = computeAllocation(selectedKeys, menu);
    const outletByName = new Map(outlets.map((o) => [o.name.toLowerCase(), o]));

    const briefs: MediaBrief[] = validated.value.tactics
      .map((t) => {
        const scored = byKey.get(t.key)!;
        const example_outlets = (t.example_outlets ?? [])
          .map((n) => outletByName.get(n.toLowerCase()))
          .filter((o): o is NamedOutlet => o != null);
        return {
          tactic: scored.tactic,
          rationale: t.rationale,
          format_call: t.format_call ?? [],
          example_outlets,
          reach_target: reachFrequencyTarget(scored.tactic),
          allocation_pct: alloc.get(t.key) ?? 0,
          affordable: scored.affordable,
        };
      })
      .sort((a, b) => STAGE_ORDER[a.tactic.funnel_stage] - STAGE_ORDER[b.tactic.funnel_stage]);

    const total = [...alloc.values()].reduce((a, b) => a + b, 0);
    const readiness = computeReadiness(briefs.map((b) => b.tactic), foundation);

    return {
      briefs,
      narrative: validated.value.narrative,
      readiness,
      total_allocation_pct: total,
      confidence,
      warnings: validated.value.warnings,
    };
  }

  throw new GroundingError(lastErrors);
}
