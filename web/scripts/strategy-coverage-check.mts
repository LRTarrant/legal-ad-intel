/**
 * Strategy Engine — per-state output-quality COVERAGE CHECK (read-only diagnostic).
 *
 * Drives the REAL engine data layer (`assembleStrategyInputs` + the 3 route-level
 * RPCs the generate route calls) for every U.S. jurisdiction, statewide AND at
 * each state's top-ranked DMA, then records the coverage metrics that decide
 * whether the grounded strategist can produce a strong strategy or visibly thins
 * out. NO LLM call, NO browser — this is the deterministic ground truth for the
 * data-gap vs by-design classification.
 *
 * Run:  npx tsx scripts/strategy-coverage-check.mts
 * Out:  prints a summary table + writes full JSON to the path printed at the end.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "node:fs";
import { assembleStrategyInputs } from "../lib/strategy-engine/assemble-inputs";

/* ── env ─────────────────────────────────────────────────────────────────── */
function loadEnv(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[m[1]] = v;
  }
  return out;
}
const env = loadEnv(new URL("../.env.local", import.meta.url).pathname);
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL / SERVICE_ROLE_KEY in web/.env.local");
  process.exit(1);
}
const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

/* ── case type (one, for cross-state comparability) ──────────────────────── */
const TORT_SLUG = "motor_vehicle";
const TORT_LABEL = "Motor Vehicle Accident";

const JURISDICTIONS = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM",
  "NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA",
  "WV","WI","WY",
];

/* ── helpers ─────────────────────────────────────────────────────────────── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpc = async (fn: string, params: Record<string, unknown>): Promise<{ rows: any[]; error: string | null }> => {
  const { data, error } = await sb.rpc(fn, params);
  return { rows: Array.isArray(data) ? data : data ? [data] : [], error: error ? String((error as { message?: string }).message ?? error) : null };
};

async function topDma(state: string): Promise<{ code: string | null; name: string | null }> {
  // mirror assemble-inputs: dma_markets covering the state, ranked
  const { data } = await sb
    .from("dma_markets")
    .select("dma_code, display_name, rank, primary_state, states_covered")
    .contains("states_covered", [state])
    .order("rank", { ascending: true })
    .limit(1);
  const row = (data as { dma_code: string; display_name: string }[] | null)?.[0];
  return { code: row?.dma_code ?? null, name: row?.display_name ?? null };
}

interface PassMetrics {
  scope: "statewide" | "top_dma";
  dma_code: string | null;
  dma_name: string | null;
  total_advertisers: number | null;
  top_advertisers: number;
  channels: number;
  channels_with_competition: number;
  outlets: number;
  county_dma_links: number;
  local_signal_counties: number;
  demographic_note: string | null;
  available: Record<string, boolean>;
  // route-level RPCs
  opportunity_counties: number;
  whitespace_channels: number;
  whitespace_statuses: string[];
  creatives: number;
  creatives_youtube: number;
  creatives_paid_search: number;
  assemble_errors: string[];
  rpc_errors: string[];
  fatal_floor: boolean; // would the route 422? (no channels AND no local_signal)
}

async function runPass(state: string, scope: "statewide" | "top_dma", dma: { code: string | null; name: string | null }): Promise<PassMetrics> {
  const dmaCode = scope === "statewide" ? null : dma.code;
  const { inputs, errors } = await assembleStrategyInputs(
    sb as unknown as Parameters<typeof assembleStrategyInputs>[0],
    state,
    { tortSlug: TORT_SLUG, tortLabel: TORT_LABEL, dmaCode },
  );

  const [opp, ws, cr] = await Promise.all([
    rpc("strategy_opportunity_counties", { p_state: state, p_fips_full: null }),
    rpc("strategy_whitespace_channels", { p_state: state, p_dma_code: dmaCode, p_tort_slug: TORT_SLUG }),
    rpc("strategy_market_creatives", { p_state: state, p_dma_code: dmaCode, p_limit_per: 3 }),
  ]);
  const rpcErrors = [opp.error, ws.error, cr.error].filter(Boolean) as string[];

  const channelsWithComp = inputs.channels.filter((c) => c.competition != null).length;
  const fatalFloor = inputs.channels.length === 0 && !inputs.local_signal;

  return {
    scope,
    dma_code: dmaCode,
    dma_name: scope === "statewide" ? null : dma.name,
    total_advertisers: inputs.total_advertisers,
    top_advertisers: inputs.top_advertisers.length,
    channels: inputs.channels.length,
    channels_with_competition: channelsWithComp,
    outlets: inputs.outlets.length,
    county_dma_links: inputs.county_dma.length,
    local_signal_counties: inputs.local_signal?.top_counties?.length ?? 0,
    demographic_note: inputs.demographic_note,
    available: { ...inputs.available },
    opportunity_counties: opp.rows.length,
    whitespace_channels: ws.rows.length,
    whitespace_statuses: ws.rows.map((r) => `${r.channel}:${r.status}(${r.active_firms})`),
    creatives: cr.rows.length,
    creatives_youtube: cr.rows.filter((r) => String(r.channel).includes("youtube") || String(r.channel).includes("video")).length,
    creatives_paid_search: cr.rows.filter((r) => String(r.channel).includes("search")).length,
    assemble_errors: errors,
    rpc_errors: rpcErrors,
    fatal_floor: fatalFloor,
  };
}

function grade(dmaPass: PassMetrics, statePass: PassMetrics): { tier: string; reasons: string[] } {
  const reasons: string[] = [];
  const advN = statePass.top_advertisers;
  if (statePass.fatal_floor && dmaPass.fatal_floor) reasons.push("FATAL: route would 422 (no channels + no FARS)");
  if (advN === 0) reasons.push("no paid-search competitors (pi_search_observations empty)");
  // distinguish: stations exist statewide but vanish at the DMA = name-match fragility (code-fixable),
  // vs no stations at all = data gap.
  if (statePass.outlets === 0) reasons.push("no named outlets even statewide (broadcast_stations/media_outlets empty for state)");
  else if (dmaPass.outlets === 0) reasons.push("outlets exist statewide but 0 at top DMA (dma_markets name ≠ broadcast_stations.nielsen_dma)");
  if (statePass.local_signal_counties === 0) reasons.push("no FARS county signal (get_state_accident_summary)");
  if (statePass.opportunity_counties === 0) reasons.push("no opportunity counties (census/FARS/crosswalk)");
  if (statePass.creatives === 0) reasons.push("no creative samples");

  let tier: string;
  if (statePass.fatal_floor) tier = "BLOCKED";
  else if (advN === 0 && statePass.creatives === 0 && statePass.outlets === 0) tier = "DATA-STARVED";
  else if (advN < 3 || dmaPass.outlets < 3) tier = "THIN";
  else tier = "DEMO-READY";
  return { tier, reasons };
}

/* ── run (small concurrent batches) ──────────────────────────────────────── */
async function main() {
  const results: Record<string, { dma: { code: string | null; name: string | null }; statewide: PassMetrics; top_dma: PassMetrics; grade: { tier: string; reasons: string[] } }> = {};
  const batchSize = 5;
  for (let i = 0; i < JURISDICTIONS.length; i += batchSize) {
    const batch = JURISDICTIONS.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (state) => {
        const dma = await topDma(state);
        const [statewide, top_dma] = await Promise.all([runPass(state, "statewide", dma), runPass(state, "top_dma", dma)]);
        results[state] = { dma, statewide, top_dma, grade: grade(top_dma, statewide) };
        process.stderr.write(`  ${state} done (${results[state].grade.tier})\n`);
      }),
    );
  }

  // summary table
  const order = ["DEMO-READY", "THIN", "DATA-STARVED", "BLOCKED"];
  const sorted = Object.entries(results).sort(
    (a, b) => order.indexOf(a[1].grade.tier) - order.indexOf(b[1].grade.tier) || a[0].localeCompare(b[0]),
  );
  console.log("\nST  TIER          DMA(top)        adv  ch  sOut dOut  fars  oppC  wsCh  crea  audFit  note");
  console.log("──  ────────────  ──────────────  ───  ──  ──── ────  ────  ────  ────  ────  ──────  ────");
  for (const [st, r] of sorted) {
    const d = r.top_dma, s = r.statewide;
    const row = [
      st.padEnd(2),
      r.grade.tier.padEnd(12),
      String(r.dma.name ?? "—").slice(0, 14).padEnd(14),
      String(s.top_advertisers).padStart(3),
      String(s.channels).padStart(2),
      String(s.outlets).padStart(4),
      String(d.outlets).padStart(4),
      String(s.local_signal_counties).padStart(4),
      String(s.opportunity_counties).padStart(4),
      String(s.whitespace_channels).padStart(4),
      String(s.creatives).padStart(4),
      (s.available.audience_fit ? "yes" : "NO").padStart(6),
      s.demographic_note ? "Y" : "·",
    ].join("  ");
    console.log(row);
  }

  const tally: Record<string, number> = {};
  for (const [, r] of sorted) tally[r.grade.tier] = (tally[r.grade.tier] ?? 0) + 1;
  console.log("\nTier tally:", tally);

  const outPath = "/private/tmp/claude-501/-Users-lancetarrant-legal-ad-intel/96968307-f03e-4c0d-b943-5584e1ead65c/scratchpad/strategy-coverage.json";
  writeFileSync(outPath, JSON.stringify({ tort: { slug: TORT_SLUG, label: TORT_LABEL }, generated_at_note: "see report", results }, null, 2));
  console.log("\nFull JSON →", outPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
