import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface AiInsightsRequest {
  tort_name: string;
  states: string[];
  monthly_budget?: number;
  firm_name?: string;
  firm_url?: string;
  plan_data: {
    tort_overview: {
      lifecycle_phase: string;
      cpl_range: { low: number | null; high: number | null };
      cpa_range: { low: number | null; high: number | null };
      cpk_range: { low: number | null; high: number | null };
      lead_to_retainer_pct: number | null;
      trend_direction: "up" | "down" | "flat";
    };
    geo_recommendations: {
      state: string;
      population: number;
      incidence: number;
      saturation_score: number;
      opportunity_score: number;
      opportunity_level: string;
    }[];
    channel_mix: {
      lifecycle_note: string;
      primary: { channel: string; allocation_pct: number }[];
      secondary: { channel: string; allocation_pct: number }[];
    };
    budget_projection: {
      monthly_budget: number;
      avg_cpl: number;
      expected_leads_per_month: number;
      expected_retainers_per_month: number;
    } | null;
  };
}

export interface AiInsightsResponse {
  strategic_brief: string;
  market_context: string;
  ad_copy: {
    meta: {
      headlines: string[];
      body_options: string[];
      ctas: string[];
    };
    google_search: {
      headlines: string[];
      descriptions: string[];
    };
  };
  compliance_notes: string[];
  risk_factors: string[];
  opportunities: string[];
  competitive_insights: string;
  historical_playbook: string;
}

const SYSTEM_PROMPT = `You are a senior legal advertising strategist with 15+ years of experience in mass tort litigation advertising. You have deep expertise in:
- Mass tort litigation lifecycle and advertising patterns
- Legal advertising compliance (state bar rules, FTC guidelines, ABA Model Rules)
- Media buying across digital (Meta, Google), TV, radio, CTV, and print
- Current regulatory environment and industry trends
- CPL/CPA optimization and budget allocation for legal campaigns

You will be given structured campaign planning data including real cost benchmarks, geographic opportunity scores, saturation metrics, and channel recommendations. Use this data to generate strategic insights, ad copy, and compliance guidance.

IMPORTANT: Always respond with valid JSON matching the exact schema provided. Do not include markdown, code fences, or any text outside the JSON object.
CRITICAL: Only reference the specific injury/disease provided in the tort context. Do NOT guess or add other medical conditions.`;

function buildUserPrompt(
  req: AiInsightsRequest,
  matchedTort: { name?: string; disease_or_injury?: string; product_or_exposure?: string; status?: string; notes?: string } | null,
): string {
  const { tort_name, states, monthly_budget, firm_name, firm_url, plan_data } = req;
  const { tort_overview, geo_recommendations, channel_mix, budget_projection } = plan_data;

  const topStates = geo_recommendations
    .filter((g) => g.opportunity_level === "high" || g.opportunity_level === "moderate")
    .slice(0, 5);

  const firmSection = firm_name
    ? `\nFIRM/COMPANY: ${firm_name}${firm_url ? ` (${firm_url})` : ""}\nIMPORTANT: Naturally incorporate the firm name "${firm_name}" into ad copy. For Meta ads, weave the firm name into headlines (e.g., "${firm_name} — Fighting for [Tort] Victims"). For Google RSA, include the firm name in at least 2 headlines.${firm_url ? ` Use "${firm_url.replace(/^https?:\/\//, "").replace(/\/$/, "")}" as the display URL reference in Google ad descriptions where appropriate.` : ""}`
    : "";

  let tortContextSection = "";
  if (matchedTort) {
    tortContextSection = `

TORT MEDICAL/LEGAL CONTEXT:
- Product/Exposure: ${matchedTort.product_or_exposure ?? "N/A"}
- Injury/Disease: ${matchedTort.disease_or_injury ?? "N/A"}
- CRITICAL: Only reference the injury/disease listed above in all ad copy and strategic recommendations. Do NOT mention other side effects or medical conditions not listed here.`;
  }

  return `Generate a comprehensive campaign strategy for the following mass tort:

TORT: ${tort_name}
LIFECYCLE PHASE: ${tort_overview.lifecycle_phase}
TREND: ${tort_overview.trend_direction} (search interest)
TARGET STATES: ${states.join(", ")}
${monthly_budget ? `MONTHLY BUDGET: $${monthly_budget.toLocaleString()}` : "BUDGET: Not specified"}${firmSection}
${tortContextSection}

COST BENCHMARKS:
- CPL Range: $${tort_overview.cpl_range.low ?? "N/A"} - $${tort_overview.cpl_range.high ?? "N/A"}
- CPA Range: $${tort_overview.cpa_range.low ?? "N/A"} - $${tort_overview.cpa_range.high ?? "N/A"}
- CPK Range: $${tort_overview.cpk_range.low ?? "N/A"} - $${tort_overview.cpk_range.high ?? "N/A"}
- Lead-to-Retainer: ${tort_overview.lead_to_retainer_pct ?? "N/A"}%

TOP OPPORTUNITY MARKETS:
${topStates.map((s) => `- ${s.state}: Pop ${s.population.toLocaleString()}, Incidence ${s.incidence.toLocaleString()}, Saturation ${s.saturation_score}/100, Opportunity ${s.opportunity_score}/100 (${s.opportunity_level})`).join("\n")}

CHANNEL STRATEGY: ${channel_mix.lifecycle_note}
Primary channels: ${channel_mix.primary.map((c) => `${c.channel} (${c.allocation_pct}%)`).join(", ")}
Secondary channels: ${channel_mix.secondary.map((c) => `${c.channel} (${c.allocation_pct}%)`).join(", ")}

${budget_projection ? `BUDGET PROJECTION: $${budget_projection.monthly_budget.toLocaleString()}/mo → ~${budget_projection.expected_leads_per_month} leads → ~${budget_projection.expected_retainers_per_month} retainers at $${budget_projection.avg_cpl} avg CPL` : ""}

Respond with a JSON object with these exact keys:
{
  "strategic_brief": "2-3 paragraphs of strategic narrative covering timing, positioning, and overall recommendation",
  "market_context": "External intelligence beyond the data — FDA actions, recent verdicts, regulatory changes, settlements, industry trends affecting this tort",
  "ad_copy": {
    "meta": {
      "headlines": ["3 Facebook/Instagram ad headlines, 40 chars max each${firm_name ? ` — reference '${firm_name}' naturally in at least one headline` : ""}"],
      "body_options": ["2 ad body text options, 125 chars max each"],
      "ctas": ["2 CTA button texts"]
    },
    "google_search": {
      "headlines": ["5 Google RSA headlines, 30 chars max each${firm_name ? ` — include '${firm_name}' in at least 2 headlines` : ""}"],
      "descriptions": ["3 Google RSA descriptions, 90 chars max each"]
    }
  },
  "compliance_notes": ["3-5 state-specific compliance requirements and required disclaimers for the target states"],
  "risk_factors": ["3-5 risks and things to watch out for"],
  "opportunities": ["3-5 untapped angles, underserved demographics, timing windows"],
  "competitive_insights": "Paragraph about competitive landscape for this tort — who's spending, market dynamics, gaps",
  "historical_playbook": "Paragraph about how similar torts played out historically — timing, CPL trends, what worked"
}`;
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

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI insights not configured" },
        { status: 503 },
      );
    }

    const body: AiInsightsRequest = await req.json();
    if (!body.tort_name || !body.states || !body.plan_data) {
      return NextResponse.json(
        { error: "tort_name, states, and plan_data are required" },
        { status: 400 },
      );
    }

    // Fetch tort medical context for grounding
    const db = supabase as any;
    const tortLower = body.tort_name.toLowerCase();

    const [tortResult] = await Promise.allSettled([
      db.from("mass_torts").select("name, disease_or_injury, product_or_exposure, status, notes"),
    ]);

    const tortData = tortResult.status === "fulfilled" ? tortResult.value.data : null;
    const matchedTort = (tortData ?? []).find((t: any) => {
      const tname = (t.name ?? "").toLowerCase();
      return tname.includes(tortLower) || tortLower.includes(tname);
    }) ?? null;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    try {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o",
            temperature: 0.7,
            max_tokens: 2000,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: buildUserPrompt(body, matchedTort) },
            ],
          }),
          signal: controller.signal,
        },
      );

      clearTimeout(timeout);

      if (!response.ok) {
        const errBody = await response.text().catch(() => "");
        console.error("OpenAI API error:", response.status, errBody);
        return NextResponse.json(
          { error: "AI service unavailable" },
          { status: 502 },
        );
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        return NextResponse.json(
          { error: "Empty AI response" },
          { status: 502 },
        );
      }

      const insights: AiInsightsResponse = JSON.parse(content);

      return NextResponse.json(insights);
    } catch (err) {
      clearTimeout(timeout);
      if (err instanceof DOMException && err.name === "AbortError") {
        return NextResponse.json(
          { error: "AI request timed out" },
          { status: 504 },
        );
      }
      throw err;
    }
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
