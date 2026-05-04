import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { routePracticeArea } from "@/lib/campaign-builder/practice-area-router";
import type { PICategory, SeverityModifier } from "@/lib/campaign-builder/pi-templates/types";
import {
  checkCampaignBuilderEntitlement,
  entitlementErrorBody,
} from "@/lib/campaign-builder/entitlements";
import {
  DemoModeAccessDenied,
  readDemoModeOverride,
} from "@/lib/admin/demo-mode";

const CANCER_TORTS = ["Roundup", "Talcum Powder", "AFFF", "Paraquat"];
const ACCIDENT_TORTS = ["Motor Vehicle", "Large Truck", "Motorcycle"];

interface PlanRequest {
  // Mass tort path (existing fields)
  tort_name?: string;
  states?: string[];
  monthly_budget?: number;

  // PI path (new)
  practice_area?: "mass_tort" | "personal_injury";
  pi_category?: PICategory;
  market_dma_code?: string;
  market_display_name?: string;
  state?: string;
  state_full_name?: string;
  firm_name?: string;
  severity_modifiers?: SeverityModifier[];
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: PlanRequest = await req.json();

    // ── Server-side entitlement gate ───────────────────────────────────
    // The UI gates practice_area tabs client-side, but we re-check here
    // so a direct API call can't bypass. /plan does not create a campaign
    // row — it only computes a plan — so we skip the monthly cap check
    // (the cap counts rows in `campaigns`, enforced in /save).
    {
      const practiceArea =
        body.practice_area === "personal_injury" ? "personal_injury" : "mass_tort";
      const stateForCheck =
        practiceArea === "personal_injury"
          ? body.state ?? null
          : Array.isArray(body.states) && body.states.length === 1
            ? body.states[0]
            : null;
  // Admin demo-mode override (super_admin only). Spoofed headers
  // surface as 403; absent headers => real subscription path.
  let demoMode;
  try {
    demoMode = await readDemoModeOverride(supabase, req, user.id);
  } catch (e) {
    if (e instanceof DemoModeAccessDenied) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    throw e;
  }

      const gate = await checkCampaignBuilderEntitlement(supabase, user.id, {
        practice_area: practiceArea,
        state: stateForCheck,
        is_create: false,
      }, demoMode);
      if (!gate.ok) {
        const { body: errBody, status } = entitlementErrorBody(gate);
        return NextResponse.json(errBody, { status });
      }
    }

    // ── PI path ────────────────────────────────────────────────────────
    // When practice_area=personal_injury, route through the new PI
    // template system. Returns a different response shape than the
    // mass tort path — callers (the campaign builder client) branch on
    // `practice_area` in the response to render the right UI.
    if (body.practice_area === "personal_injury") {
      try {
        const result = routePracticeArea({
          practice_area: "personal_injury",
          pi_category: body.pi_category,
          market_display_name: body.market_display_name,
          market_dma_code: body.market_dma_code,
          state: body.state,
          state_full_name: body.state_full_name,
          firm_name: body.firm_name,
          severity_modifiers: body.severity_modifiers,
        });

        if (result.practice_area !== "personal_injury") {
          // Type narrowing for TS — router would have thrown otherwise.
          throw new Error("Router returned unexpected practice_area");
        }

        return NextResponse.json({
          practice_area: "personal_injury",
          template: result.template,
          base_template: result.baseTemplate,
          severity_modifiers: result.severity_modifiers,
          compliance: {
            flags: result.compliance_flags,
            state: result.compliance_state,
            state_name: result.compliance_state_name,
            has_explicit_rules: result.compliance_has_explicit_rules,
          },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown PI routing error";
        return NextResponse.json(
          { error: "PI plan failed", details: message },
          { status: 400 },
        );
      }
    }

    // ── Mass tort path (existing logic, unchanged below) ───────────────
    const { tort_name, states, monthly_budget } = body;

    if (!tort_name || !states || !Array.isArray(states) || states.length === 0) {
      return NextResponse.json(
        { error: "tort_name and states[] are required" },
        { status: 400 },
      );
    }

    // Parallel data fetches with Promise.allSettled
    // Cast to any for tables not yet in generated Database types
    const db = supabase as any;
    const [
      benchmarksResult,
      channelRolesResult,
      competitionResult,
      audienceResult,
      demographicsResult,
      cancerResult,
      farsResult,
      saturationResult,
      geoTargetsResult,
      mdlResult,
      trendsResult,
    ] = await Promise.allSettled([
      db
        .from("tort_cost_benchmarks")
        .select("*")
        .ilike("tort_name", `%${tort_name}%`)
        .order("observed_date", { ascending: false }),
      db.from("channel_roles").select("*"),
      db.from("channel_competition_scores").select("*"),
      db
        .from("tort_audience_profiles")
        .select("*")
        .ilike("tort_id", `%${tort_name}%`),
      db
        .from("census_demographics")
        .select("*")
        .in("state", states),
      CANCER_TORTS.some((t) => tort_name.toLowerCase().includes(t.toLowerCase()))
        ? db
            .from("cancer_incidence")
            .select("*")
            .in("state", states)
        : Promise.resolve({ data: [], error: null }),
      ACCIDENT_TORTS.some((t) =>
        tort_name.toLowerCase().includes(t.toLowerCase()),
      )
        ? db
            .from("fars_fatalities")
            .select("*")
            .in("state", states)
        : Promise.resolve({ data: [], error: null }),
      db.from("ad_saturation_scores").select("*"),
      db.from("geo_targets").select("*"),
      db
        .from("mdl_developments")
        .select("*")
        .ilike("tort_name", `%${tort_name}%`)
        .order("created_at", { ascending: false })
        .limit(5),
      db
        .from("google_trends_observations")
        .select("*")
        .ilike("keyword", `%${tort_name}%`)
        .order("week_of", { ascending: false })
        .limit(12),
    ]);

    // Extract data safely
    const extract = <T>(
      result: PromiseSettledResult<{ data: T | null; error: unknown }>,
    ): T | null => {
      if (result.status === "fulfilled" && !result.value.error) {
        return result.value.data;
      }
      return null;
    };

    const benchmarks = (extract(benchmarksResult) as Record<string, unknown>[] | null) ?? [];
    const channelRoles = (extract(channelRolesResult) as Record<string, unknown>[] | null) ?? [];
    const competition = (extract(competitionResult) as Record<string, unknown>[] | null) ?? [];
    const audience = (extract(audienceResult) as Record<string, unknown>[] | null) ?? [];
    const demographics = (extract(demographicsResult) as Record<string, unknown>[] | null) ?? [];
    const cancerData = (extract(cancerResult) as Record<string, unknown>[] | null) ?? [];
    const farsData = (extract(farsResult) as Record<string, unknown>[] | null) ?? [];
    const saturation = (extract(saturationResult) as Record<string, unknown>[] | null) ?? [];
    const geoTargets = (extract(geoTargetsResult) as Record<string, unknown>[] | null) ?? [];
    const mdlDevelopments = (extract(mdlResult) as Record<string, unknown>[] | null) ?? [];
    const trends = (extract(trendsResult) as Record<string, unknown>[] | null) ?? [];

    // --- 1. Tort Overview ---
    const latestBenchmark = benchmarks[0] ?? null;
    const lifecyclePhase = (latestBenchmark?.lifecycle_phase as string) ?? "unknown";
    const cplLow = latestBenchmark?.cpl_low != null ? Number(latestBenchmark.cpl_low) : null;
    const cplHigh = latestBenchmark?.cpl_high != null ? Number(latestBenchmark.cpl_high) : null;
    const cpaLow = latestBenchmark?.cpa_low != null ? Number(latestBenchmark.cpa_low) : null;
    const cpaHigh = latestBenchmark?.cpa_high != null ? Number(latestBenchmark.cpa_high) : null;
    const cpkLow = latestBenchmark?.cpk_low != null ? Number(latestBenchmark.cpk_low) : null;
    const cpkHigh = latestBenchmark?.cpk_high != null ? Number(latestBenchmark.cpk_high) : null;
    const leadToRetainerPct =
      latestBenchmark?.lead_to_retainer_pct != null
        ? Number(latestBenchmark.lead_to_retainer_pct)
        : null;

    // Trend direction from google_trends_observations
    let trendDirection: "up" | "down" | "flat" = "flat";
    if (trends.length >= 4) {
      const recent = trends.slice(0, 4).reduce((sum, t) => sum + Number(t.interest ?? 0), 0) / 4;
      const older = trends.slice(4, 8).reduce((sum, t) => sum + Number(t.interest ?? 0), 0) / Math.min(trends.slice(4, 8).length, 4);
      if (older > 0) {
        const change = (recent - older) / older;
        if (change > 0.1) trendDirection = "up";
        else if (change < -0.1) trendDirection = "down";
      }
    }

    const tortOverview = {
      tort_name,
      lifecycle_phase: lifecyclePhase,
      cpl_range: { low: cplLow, high: cplHigh },
      cpa_range: { low: cpaLow, high: cpaHigh },
      cpk_range: { low: cpkLow, high: cpkHigh },
      lead_to_retainer_pct: leadToRetainerPct,
      latest_mdl: mdlDevelopments[0]
        ? {
            title: mdlDevelopments[0].title ?? mdlDevelopments[0].event_type,
            date: mdlDevelopments[0].event_date ?? mdlDevelopments[0].created_at,
            summary: mdlDevelopments[0].summary ?? mdlDevelopments[0].description ?? null,
          }
        : null,
      trend_direction: trendDirection,
    };

    // --- 2. Geo Recommendations ---
    const isCancerTort = CANCER_TORTS.some((t) =>
      tort_name.toLowerCase().includes(t.toLowerCase()),
    );

    const statePopulations = new Map<string, number>();
    for (const d of demographics) {
      const st = d.state as string;
      const pop = Number(d.population ?? d.total_population ?? 0);
      statePopulations.set(st, (statePopulations.get(st) ?? 0) + pop);
    }

    // Aggregate incidence per state
    const stateIncidence = new Map<string, number>();
    const incidenceData = isCancerTort ? cancerData : farsData;
    for (const row of incidenceData) {
      const st = row.state as string;
      const count = Number(row.count ?? row.cases ?? row.fatalities ?? row.deaths ?? 1);
      stateIncidence.set(st, (stateIncidence.get(st) ?? 0) + count);
    }

    // Saturation lookup
    const saturationMap = new Map<string, number>();
    for (const s of saturation) {
      const key = `${(s.state as string) ?? ""}|${(s.tort_name as string) ?? ""}`.toLowerCase();
      saturationMap.set(key, Number(s.saturation_score ?? s.score ?? 50));
    }

    const geoRecommendations = states.map((state) => {
      const population = statePopulations.get(state) ?? 0;
      const incidence = stateIncidence.get(state) ?? 0;

      // Find saturation for this state/tort combo, fall back to state-level, then default
      const satKey = `${state.toLowerCase()}|${tort_name.toLowerCase()}`;
      const stateKey = `${state.toLowerCase()}|`;
      const satScore =
        saturationMap.get(satKey) ?? saturationMap.get(stateKey) ?? 50;

      // Opportunity score: normalize incidence (higher = better), penalize saturation
      const incidenceNorm = population > 0 ? (incidence / population) * 100000 : 0;
      const opportunityScore = Math.round(
        Math.max(0, Math.min(100, incidenceNorm * 10 - satScore * 0.5 + 50)),
      );

      return {
        state,
        population,
        incidence,
        saturation_score: satScore,
        opportunity_score: opportunityScore,
        opportunity_level:
          opportunityScore >= 70
            ? "high"
            : opportunityScore >= 40
              ? "moderate"
              : "low",
      };
    });

    geoRecommendations.sort((a, b) => b.opportunity_score - a.opportunity_score);

    // Map states to DMAs
    const STATE_DMA_MAP: Record<string, string[]> = {
      NY: ["New York"],
      CA: ["Los Angeles"],
      IL: ["Chicago"],
      PA: ["Philadelphia"],
      DC: ["Washington DC"],
      TX: ["Houston", "Dallas-Fort Worth"],
      GA: ["Atlanta"],
      FL: ["Tampa", "Miami"],
    };

    const relevantDmas = geoTargets.filter((dma) => {
      const dmaName = (dma.dma_name ?? dma.name ?? "") as string;
      return states.some((st) =>
        (STATE_DMA_MAP[st] ?? []).some((d) =>
          dmaName.toLowerCase().includes(d.toLowerCase()),
        ),
      );
    });

    // --- 3. Channel Mix Recommendation ---
    const channelsByPriority = {
      core: [] as Record<string, unknown>[],
      secondary: [] as Record<string, unknown>[],
      situational: [] as Record<string, unknown>[],
    };

    for (const ch of channelRoles) {
      const priority = (ch.mass_tort_priority as string) ?? "situational";
      const bucket =
        priority === "core"
          ? channelsByPriority.core
          : priority === "secondary"
            ? channelsByPriority.secondary
            : channelsByPriority.situational;
      bucket.push(ch);
    }

    // Lifecycle adjustments
    const isEmerging = lifecyclePhase === "emerging" || lifecyclePhase === "buzzy";

    const channelMix = {
      primary: channelsByPriority.core.map((ch) => {
        const compEntry = competition.find(
          (c) =>
            (c.channel as string)?.toLowerCase() ===
            (ch.channel as string)?.toLowerCase(),
        );
        return {
          channel: ch.channel,
          role: ch.role,
          cost_pressure: ch.cost_pressure,
          competition_score: compEntry?.competition_score ?? compEntry?.score ?? null,
          allocation_pct: 50 / Math.max(channelsByPriority.core.length, 1),
          recommendation: isEmerging
            ? "High priority — early mover advantage in emerging tort"
            : "Core channel for established tort litigation",
        };
      }),
      secondary: channelsByPriority.secondary.map((ch) => {
        const compEntry = competition.find(
          (c) =>
            (c.channel as string)?.toLowerCase() ===
            (ch.channel as string)?.toLowerCase(),
        );
        return {
          channel: ch.channel,
          role: ch.role,
          cost_pressure: ch.cost_pressure,
          competition_score: compEntry?.competition_score ?? compEntry?.score ?? null,
          allocation_pct: 30 / Math.max(channelsByPriority.secondary.length, 1),
          recommendation: isEmerging
            ? "Digital-first secondary channel"
            : "Broaden reach with secondary channels",
        };
      }),
      situational: channelsByPriority.situational.map((ch) => ({
        channel: ch.channel,
        role: ch.role,
        cost_pressure: ch.cost_pressure,
        allocation_pct: 20 / Math.max(channelsByPriority.situational.length, 1),
      })),
      lifecycle_note: isEmerging
        ? "Emerging/buzzy tort — lean into digital channels for early mover advantage. CPLs are lower before market saturation."
        : lifecyclePhase === "late"
          ? "Late-stage tort — broader reach needed. Expect higher CPLs due to market saturation."
          : "Active MDL stage — balanced approach across digital and traditional channels.",
    };

    // --- 4. Audience Targeting ---
    const audienceProfile = audience[0] ?? null;
    const ageBandWeights = audienceProfile?.age_band_weights ?? null;

    // Generate keyword themes based on tort name
    const tortKeywords = generateKeywordThemes(tort_name);

    const audienceTargeting = {
      age_bands: ageBandWeights,
      meta_targeting: {
        age_ranges: formatAgeBands(ageBandWeights),
        interests: generateMetaInterests(tort_name),
        demographics: "Adults, legal-interest audiences",
      },
      google_targeting: {
        keyword_themes: tortKeywords,
        audience_segments: [
          "In-market: Legal Services",
          `Custom intent: ${tort_name} lawsuit`,
          `Custom intent: ${tort_name} settlement`,
        ],
      },
      state_specific_notes: states.length > 3
        ? "Consider state-specific ad copy and landing pages for top opportunity states."
        : "Tailor messaging to state-specific regulations and case law.",
    };

    // --- 5. Budget Projection ---
    let budgetProjection = null;
    if (monthly_budget && monthly_budget > 0 && cplLow != null) {
      const avgCpl = cplLow && cplHigh ? (cplLow + cplHigh) / 2 : cplLow ?? 200;
      const expectedLeads = Math.round(monthly_budget / avgCpl);
      const convRate = (leadToRetainerPct ?? 15) / 100;
      const expectedRetainers = Math.round(expectedLeads * convRate);
      const avgCpk = cpkLow && cpkHigh ? (cpkLow + cpkHigh) / 2 : null;

      const coreAllocation = Math.round(monthly_budget * 0.5);
      const secondaryAllocation = Math.round(monthly_budget * 0.3);
      const situationalAllocation = monthly_budget - coreAllocation - secondaryAllocation;

      budgetProjection = {
        monthly_budget,
        avg_cpl: avgCpl,
        expected_leads_per_month: expectedLeads,
        lead_to_retainer_pct: leadToRetainerPct ?? 15,
        expected_retainers_per_month: expectedRetainers,
        cost_per_kept_case: avgCpk,
        channel_split: {
          core: { label: "Core Channels", amount: coreAllocation, pct: 50 },
          secondary: { label: "Secondary Channels", amount: secondaryAllocation, pct: 30 },
          situational: { label: "Situational Channels", amount: situationalAllocation, pct: 20 },
        },
      };
    }

    return NextResponse.json({
      tort_overview: tortOverview,
      geo_recommendations: geoRecommendations,
      relevant_dmas: relevantDmas.map((d) => ({
        name: d.dma_name ?? d.name,
        population: d.population ?? d.tv_households,
      })),
      channel_mix: channelMix,
      audience_targeting: audienceTargeting,
      budget_projection: budgetProjection,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// --- Helpers ---

function generateKeywordThemes(tortName: string): string[] {
  const base = tortName.toLowerCase().replace(/[^a-z0-9\s]/g, "");
  return [
    `${base} lawsuit`,
    `${base} settlement`,
    `${base} attorney`,
    `${base} lawyer near me`,
    `${base} class action`,
    `${base} side effects`,
    `${base} compensation`,
    `am I eligible for ${base} lawsuit`,
  ];
}

function generateMetaInterests(tortName: string): string[] {
  const interests = ["Personal injury law", "Mass tort litigation", "Legal services"];
  const tn = tortName.toLowerCase();
  if (tn.includes("roundup") || tn.includes("paraquat")) {
    interests.push("Gardening", "Agriculture", "Landscaping");
  } else if (tn.includes("talcum") || tn.includes("hair relaxer")) {
    interests.push("Personal care products", "Beauty", "Health & wellness");
  } else if (tn.includes("afff")) {
    interests.push("Firefighting", "Military service", "Emergency services");
  } else if (tn.includes("ozempic") || tn.includes("glp")) {
    interests.push("Weight loss", "Diabetes", "Health & wellness");
  } else if (tn.includes("depo")) {
    interests.push("Women's health", "Contraception", "Health & wellness");
  } else if (tn.includes("social media")) {
    interests.push("Parenting", "Child safety", "Digital wellness");
  } else if (tn.includes("nec")) {
    interests.push("Neonatal care", "Parenting", "Baby formula");
  } else if (tn.includes("camp lejeune")) {
    interests.push("Military service", "Veterans", "Military bases");
  } else if (tn.includes("bard") || tn.includes("powerport")) {
    interests.push("Medical devices", "Cancer treatment", "Health & wellness");
  }
  return interests;
}

function formatAgeBands(
  ageBandWeights: unknown,
): string[] {
  if (!ageBandWeights || typeof ageBandWeights !== "object") {
    return ["25-54 (default broad targeting)"];
  }

  const bands = ageBandWeights as Record<string, number>;
  const sorted = Object.entries(bands)
    .filter(([, weight]) => weight > 0.1)
    .sort(([, a], [, b]) => b - a);

  if (sorted.length === 0) return ["25-54 (default broad targeting)"];

  return sorted.map(
    ([band, weight]) => `${band} (${Math.round(weight * 100)}% weight)`,
  );
}
