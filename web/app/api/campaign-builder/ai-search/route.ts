import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";

/* ── Types ──────────────────────────────────────────────────────────────── */

type Intent =
  | "state_targeting"
  | "tort_overview"
  | "advertiser_lookup"
  | "mdl_lookup"
  | "general";

interface IntentResult {
  intent: Intent;
  entities: {
    tort?: string;
    state?: string;
    advertiser?: string;
  };
}

interface ActionChip {
  label: string;
  href: string;
}

type ActionType =
  | "tort_detail"
  | "state_market"
  | "tort_index"
  | "mdl_index"
  | "mdl_detail"
  | "competitors"
  | "opportunity"
  | "planner"
  | "judicial_profiles"
  | "storm_events"
  | "markets_index";

interface LLMActionChip {
  label: string;
  action_type: ActionType;
  params?: Record<string, string>;
}

interface SearchResponse {
  answer: string;
  actions: ActionChip[];
  intent: Intent;
  entities: IntentResult["entities"];
}

/* ── Action URL Registry ───────────────────────────────────────────────── */

const VALID_TORT_SLUGS = new Set([
  "afff-firefighting-foam",
  "ai-suicide-self-harm",
  "bard-powerport",
  "camp-lejeune",
  "cpap",
  "depo-provera",
  "hair-relaxer",
  "hernia-mesh",
  "nec-baby-formula",
  "olympus-duodenoscope",
  "ozempic-mounjaro",
  "paraquat",
  "roblox-cse",
  "roundup",
  "social-media-addiction",
  "social-media-youth-harm",
  "talcum-powder",
  "tylenol-acetaminophen",
  "uber-sexual-assault",
  "zantac",
  "3m-earplugs",
]);

const VALID_STATE_SLUGS = new Set([
  "alabama",
  "arizona",
  "california",
  "florida",
]);

const STATE_ABBR_TO_NAME: Record<string, string> = {
  al: "alabama",
  az: "arizona",
  ca: "california",
  fl: "florida",
};

function normalizeStateName(input: string): string | null {
  const cleaned = input.trim().toLowerCase().replace(/\s+/g, "-");
  if (VALID_STATE_SLUGS.has(cleaned)) return cleaned;
  const fromAbbr = STATE_ABBR_TO_NAME[cleaned];
  if (fromAbbr) return fromAbbr;
  return null;
}

export function buildActionUrl(
  actionType: string,
  params?: Record<string, string>
): string | null {
  switch (actionType) {
    case "tort_detail": {
      const slug = params?.tort_slug?.trim().toLowerCase();
      if (!slug || !VALID_TORT_SLUGS.has(slug)) return null;
      return `/advertising/torts/${slug}`;
    }
    case "state_market": {
      const raw = params?.state_name ?? params?.state_abbr ?? "";
      const stateSlug = normalizeStateName(raw);
      if (!stateSlug) return null;
      return `/state-intelligence/${stateSlug}`;
    }
    case "tort_index":
      return "/advertising/torts";
    case "mdl_index":
      return "/mdl-tracker";
    case "mdl_detail": {
      const mdlNum = params?.mdl_number?.trim();
      if (!mdlNum) return null;
      return `/mdl-tracker/${mdlNum}`;
    }
    case "competitors":
      return "/competitors";
    case "opportunity":
      return "/opportunity";
    case "planner":
      return "/planner";
    case "judicial_profiles":
      return "/judicial-profiles";
    case "storm_events":
      return "/storm-events";
    case "markets_index":
      return "/markets";
    default:
      return null;
  }
}

/* ── Rate Limiting (in-memory, per-process) ─────────────────────────────── */

const rateLimitMap = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    rateLimitMap.set(userId, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

/* ── Prompt Templates ───────────────────────────────────────────────────── */

const INTENT_SYSTEM_PROMPT = `You are an intent classifier for a legal advertising intelligence platform.

Given a user question, extract:
1. intent — one of: "state_targeting", "tort_overview", "advertiser_lookup", "mdl_lookup", "general"
2. entities — any tort name, state, or advertiser mentioned

Rules:
- "state_targeting": user asks about which states/markets to target, geographic strategy, or state-level data for a tort
- "tort_overview": user asks about a specific tort (litigation status, settlements, CPA, trends, news)
- "advertiser_lookup": user asks about who is advertising, ad spend, competitor activity
- "mdl_lookup": user asks about MDL cases, pending actions, largest MDLs, litigation stats
- "general": anything else (legal questions, general marketing, off-topic)

Respond with ONLY valid JSON. No markdown, no explanation.
Example: {"intent":"state_targeting","entities":{"tort":"Paraquat"}}`;

function buildSynthesisPrompt(
  question: string,
  intent: Intent,
  groundingData: string
): string {
  return `You are an AI analyst embedded in a legal advertising intelligence platform called Legal Marketing Intelligence (LMI). You help plaintiff law firms and marketing agencies make data-driven decisions about mass tort advertising.

You have been given real data from the platform's database. Use ONLY this data to answer. If the data is insufficient, say so — do not fabricate numbers.

Be concise (under 250 words), data-driven, and actionable. Use markdown formatting: bold key numbers, use bullet lists for comparisons.

When suggesting actions, focus on what a plaintiff law firm or legal marketing agency would actually do next: build a campaign, check a specific state, look at advertisers, etc.

${groundingData ? `--- PLATFORM DATA ---\n${groundingData}\n--- END DATA ---\n\n` : ""}User question: ${question}
Intent classified as: ${intent}

Respond with ONLY valid JSON matching this schema:
{
  "answer": "Your prose answer with markdown formatting",
  "actions": [
    {"label": "Short action label", "action_type": "tort_detail", "params": {"tort_slug": "paraquat"}}
  ]
}

Rules for actions:
- Include 1-3 action chips linking to relevant pages
- Each action must use one of these action_type values with the required params:
  - "tort_detail" — requires params.tort_slug (lowercase, hyphenated). Known slugs: afff-firefighting-foam, ai-suicide-self-harm, bard-powerport, camp-lejeune, cpap, depo-provera, hair-relaxer, hernia-mesh, nec-baby-formula, olympus-duodenoscope, ozempic-mounjaro, paraquat, roblox-cse, roundup, social-media-addiction, social-media-youth-harm, talcum-powder, tylenol-acetaminophen, uber-sexual-assault, zantac, 3m-earplugs
  - "state_market" — requires params.state_name (full name or 2-letter abbreviation). Only these states have pages: Alabama (AL), Arizona (AZ), California (CA), Florida (FL)
  - "tort_index" — no params needed (links to tort listing)
  - "mdl_index" — no params needed (links to MDL tracker)
  - "mdl_detail" — requires params.mdl_number
  - "competitors" — no params needed
  - "opportunity" — no params needed
  - "planner" — no params needed
  - "judicial_profiles" — no params needed
  - "storm_events" — no params needed
  - "markets_index" — no params needed
- Do NOT invent action_type values outside this list
- Only suggest state_market for AL, AZ, CA, FL — omit chips for other states
- If the user's question is general/off-topic, still provide a helpful answer but use fewer or no action chips`;
}

/* ── Grounding Data Fetchers ────────────────────────────────────────────── */

async function fetchTortGrounding(
  db: any,
  tortName: string
): Promise<string> {
  const parts: string[] = [];
  const tortLower = tortName.toLowerCase();

  // 1. Mass tort metadata
  const { data: massTorts } = await db
    .from("mass_torts")
    .select("name, slug, disease_or_injury, product_or_exposure, status, category, notes")
    .limit(50);

  const matched = (massTorts ?? []).find((t: any) => {
    const n = (t.name ?? "").toLowerCase();
    return n.includes(tortLower) || tortLower.includes(n);
  });

  if (matched) {
    parts.push(
      `Tort: ${matched.name}`,
      `Status: ${matched.status ?? "N/A"}`,
      `Category: ${matched.category ?? "N/A"}`,
      `Disease/Injury: ${matched.disease_or_injury ?? "N/A"}`,
      `Product/Exposure: ${matched.product_or_exposure ?? "N/A"}`,
      matched.notes ? `Notes: ${matched.notes}` : ""
    );
  }

  // 2. Cost benchmarks
  const { data: benchmarks } = await db
    .from("tort_cost_benchmarks")
    .select("*")
    .ilike("tort_name", `%${tortName}%`)
    .order("observed_date", { ascending: false })
    .limit(3);

  if (benchmarks?.length) {
    const b = benchmarks[0];
    parts.push(
      `\nCost Benchmarks (latest):`,
      `CPL: $${b.cpl_low ?? "?"}-$${b.cpl_high ?? "?"}`,
      `CPA: $${b.cpa_low ?? "?"}-$${b.cpa_high ?? "?"}`,
      `Lifecycle Phase: ${b.lifecycle_phase ?? "N/A"}`,
      `Trend: ${b.trend_direction ?? "N/A"}`
    );
  }

  // 3. MDL data for this tort
  const { data: mdls } = await db
    .from("mdls")
    .select("mdl_number, title, status, district, judge_name")
    .ilike("title", `%${tortName}%`)
    .limit(3);

  if (mdls?.length) {
    parts.push(`\nRelated MDLs:`);
    for (const m of mdls) {
      parts.push(`- MDL ${m.mdl_number}: ${m.title} (${m.status ?? "active"}) — ${m.district ?? "N/A"}`);
    }
  }

  return parts.filter(Boolean).join("\n");
}

async function fetchStateTargetingGrounding(
  db: any,
  tortName: string
): Promise<string> {
  const parts: string[] = [];

  // 1. Ad saturation by state for this tort
  const { data: saturation } = await db
    .from("ad_saturation_summary")
    .select(
      "tort_slug, tort_label, geo_name, state_abbr, geo_population, saturation_score, total_advertisers, total_observations, estimated_spend"
    )
    .ilike("tort_label", `%${tortName}%`)
    .eq("geo_type", "state")
    .order("saturation_score", { ascending: false, nullsFirst: false })
    .limit(15);

  if (saturation?.length) {
    parts.push(`Ad Saturation by State for "${saturation[0].tort_label}":`);
    parts.push("State | Population | Saturation Score | Advertisers | Est. Spend");
    for (const s of saturation) {
      parts.push(
        `${s.geo_name} (${s.state_abbr}) | ${(s.geo_population ?? 0).toLocaleString()} | ${s.saturation_score ?? "N/A"} | ${s.total_advertisers} | $${(s.estimated_spend ?? 0).toLocaleString()}`
      );
    }
    parts.push(
      `\nInsight: States with LOWER saturation scores relative to population may represent better targeting opportunities (less competition).`
    );
  }

  // 2. Recommended markets
  const { data: recommended } = await db
    .from("tort_recommended_markets")
    .select("*")
    .ilike("tort_name", `%${tortName}%`)
    .order("rank", { ascending: true })
    .limit(10);

  if (recommended?.length) {
    parts.push(`\nRecommended Markets:`);
    for (const r of recommended) {
      parts.push(
        `- ${r.state_name ?? r.state} (${r.state}): Score ${r.score}, Signal: ${r.primary_signal}`
      );
    }
  }

  // Also fetch the tort overview for context
  const tortContext = await fetchTortGrounding(db, tortName);
  if (tortContext) {
    parts.push(`\n${tortContext}`);
  }

  return parts.filter(Boolean).join("\n");
}

async function fetchAdvertiserGrounding(
  db: any,
  tortName?: string
): Promise<string> {
  const parts: string[] = [];

  if (tortName) {
    // Get tort ID first
    const { data: torts } = await db
      .from("torts")
      .select("id, slug, label")
      .ilike("label", `%${tortName}%`)
      .limit(1);

    if (torts?.length) {
      const tortId = torts[0].id;

      // Get ad observations for this tort, grouped by advertiser
      const { data: observations } = await db
        .from("ad_observations_normalized")
        .select("advertiser_id, observation_count, unique_creatives, estimated_spend")
        .eq("tort_id", tortId)
        .limit(500);

      if (observations?.length) {
        // Aggregate by advertiser
        const advMap = new Map<string, { obs: number; creatives: number; spend: number }>();
        for (const o of observations) {
          const id = o.advertiser_id as string;
          const existing = advMap.get(id) ?? { obs: 0, creatives: 0, spend: 0 };
          existing.obs += Number(o.observation_count) || 0;
          existing.creatives += Number(o.unique_creatives) || 0;
          existing.spend += Number(o.estimated_spend) || 0;
          advMap.set(id, existing);
        }

        // Get advertiser names
        const advIds = [...advMap.keys()].slice(0, 20);
        if (advIds.length) {
          const { data: advertisers } = await db
            .from("advertiser_entities")
            .select("id, canonical_name, segment")
            .in("id", advIds);

          if (advertisers?.length) {
            const enriched = advertisers
              .map((a: any) => ({
                name: a.canonical_name,
                segment: a.segment,
                ...advMap.get(a.id)!,
              }))
              .sort((a: any, b: any) => b.spend - a.spend)
              .slice(0, 10);

            parts.push(`Top Advertisers for "${torts[0].label}":`);
            parts.push("Advertiser | Segment | Observations | Creatives | Est. Spend");
            for (const a of enriched) {
              parts.push(
                `${a.name} | ${a.segment} | ${a.obs} | ${a.creatives} | $${a.spend.toLocaleString()}`
              );
            }
          }
        }
      }
    }
  } else {
    // General advertiser overview
    const { data: advertisers } = await db
      .from("advertiser_entities")
      .select("canonical_name, segment")
      .limit(20);

    if (advertisers?.length) {
      parts.push(`Active Advertisers (sample):`);
      for (const a of advertisers) {
        parts.push(`- ${a.canonical_name} (${a.segment})`);
      }
    }
  }

  return parts.filter(Boolean).join("\n");
}

async function fetchMdlGrounding(db: any): Promise<string> {
  const parts: string[] = [];

  // Get MDLs with latest stats
  const [{ data: mdls }, { data: stats }] = await Promise.all([
    db
      .from("mdls")
      .select("id, mdl_number, title, status, district, judge_name")
      .limit(50),
    db
      .from("mdl_stats_monthly")
      .select("mdl_id, stats_month, pending_actions, pending_actions_change")
      .order("stats_month", { ascending: false })
      .limit(200),
  ]);

  if (mdls?.length && stats?.length) {
    // Build latest stats per MDL
    const latestStats = new Map<string, any>();
    for (const s of stats) {
      if (!latestStats.has(s.mdl_id)) {
        latestStats.set(s.mdl_id, s);
      }
    }

    const enriched = mdls
      .map((m: any) => {
        const s = latestStats.get(m.id);
        return {
          ...m,
          pending_actions: s?.pending_actions ?? 0,
          change: s?.pending_actions_change ?? 0,
          stats_month: s?.stats_month,
        };
      })
      .filter((m: any) => m.pending_actions > 0)
      .sort((a: any, b: any) => b.pending_actions - a.pending_actions)
      .slice(0, 10);

    parts.push(`Top MDLs by Pending Actions:`);
    parts.push("MDL # | Title | Pending Actions | MoM Change | Status");
    for (const m of enriched) {
      const changeStr =
        m.change > 0
          ? `+${m.change.toLocaleString()}`
          : m.change < 0
            ? m.change.toLocaleString()
            : "flat";
      parts.push(
        `${m.mdl_number} | ${m.title} | ${m.pending_actions.toLocaleString()} | ${changeStr} | ${m.status ?? "active"}`
      );
    }
  }

  return parts.filter(Boolean).join("\n");
}

/* ── Main Handler ───────────────────────────────────────────────────────── */

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    // Auth
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit
    if (!checkRateLimit(user.id)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Max 30 queries per hour." },
        { status: 429 }
      );
    }

    // Validate
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI search not configured" },
        { status: 503 }
      );
    }

    const { question } = await req.json();
    if (!question || typeof question !== "string" || question.trim().length < 3) {
      return NextResponse.json(
        { error: "Question is required (min 3 characters)" },
        { status: 400 }
      );
    }

    const trimmedQuestion = question.trim().slice(0, 500); // cap input length
    const openai = new OpenAI({ apiKey });
    const db = supabase as any;

    // Step 1: Intent classification + entity extraction
    const intentResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      max_tokens: 150,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: INTENT_SYSTEM_PROMPT },
        { role: "user", content: trimmedQuestion },
      ],
    });

    const intentRaw = intentResponse.choices[0]?.message?.content ?? "{}";
    let parsed: IntentResult;
    try {
      parsed = JSON.parse(intentRaw);
    } catch {
      parsed = { intent: "general", entities: {} };
    }

    // Normalize intent
    const validIntents: Intent[] = [
      "state_targeting",
      "tort_overview",
      "advertiser_lookup",
      "mdl_lookup",
      "general",
    ];
    if (!validIntents.includes(parsed.intent)) {
      parsed.intent = "general";
    }

    // Step 2: Fetch grounding data based on intent
    let groundingData = "";

    switch (parsed.intent) {
      case "state_targeting":
        if (parsed.entities.tort) {
          groundingData = await fetchStateTargetingGrounding(
            db,
            parsed.entities.tort
          );
        }
        break;

      case "tort_overview":
        if (parsed.entities.tort) {
          groundingData = await fetchTortGrounding(db, parsed.entities.tort);
        }
        break;

      case "advertiser_lookup":
        groundingData = await fetchAdvertiserGrounding(
          db,
          parsed.entities.tort
        );
        break;

      case "mdl_lookup":
        groundingData = await fetchMdlGrounding(db);
        break;

      case "general":
        // No DB grounding — go straight to LLM
        break;
    }

    // Cap grounding data at ~4k tokens (~16k chars)
    if (groundingData.length > 16000) {
      groundingData = groundingData.slice(0, 16000) + "\n... [data truncated]";
    }

    // Step 3: Synthesize answer
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    try {
      const synthesisResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: buildSynthesisPrompt(
              trimmedQuestion,
              parsed.intent,
              groundingData
            ),
          },
          { role: "user", content: trimmedQuestion },
        ],
      });

      clearTimeout(timeout);

      const content =
        synthesisResponse.choices[0]?.message?.content ?? "{}";
      let raw: { answer: string; actions: LLMActionChip[] };
      try {
        raw = JSON.parse(content);
      } catch {
        raw = {
          answer:
            "I had trouble processing that question. Could you try rephrasing?",
          actions: [],
        };
      }

      // Map LLM action_type+params to verified URLs, drop invalid chips
      const llmActions: LLMActionChip[] = Array.isArray(raw.actions)
        ? raw.actions
        : [];
      const resolvedActions: ActionChip[] = [];
      for (const action of llmActions) {
        if (resolvedActions.length >= 3) break;
        const href = buildActionUrl(action.action_type, action.params);
        if (href) {
          resolvedActions.push({ label: action.label, href });
        }
      }

      const result = { answer: raw.answer, actions: resolvedActions };

      const latencyMs = Date.now() - startTime;

      // Step 4: Log to ai_search_log (fire-and-forget)
      db.from("ai_search_log")
        .insert({
          user_id: user.id,
          question: trimmedQuestion,
          intent: parsed.intent,
          entities: parsed.entities,
          answer: result.answer,
          actions: result.actions,
          latency_ms: latencyMs,
          model: "gpt-4o-mini",
        })
        .then(() => {})
        .catch(() => {});

      const response: SearchResponse = {
        answer: result.answer,
        actions: result.actions,
        intent: parsed.intent,
        entities: parsed.entities,
      };

      return NextResponse.json(response);
    } catch (err) {
      clearTimeout(timeout);
      if (err instanceof Error && err.name === "AbortError") {
        return NextResponse.json(
          { error: "AI request timed out" },
          { status: 504 }
        );
      }
      throw err;
    }
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
