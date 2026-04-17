import { getSupabase } from "@/lib/supabase";
import { PfasClient, type PfasPageData } from "./pfas-client";
import { AskAIPanel } from "../../components/ask-ai-panel";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "PFAS Contamination Intelligence | Legal Marketing Intelligence",
  description:
    "PFAS contamination levels at 500+ U.S. military installations — geographic targeting tool for AFFF plaintiff recruitment.",
};

/* ------------------------------------------------------------------ */
/*  State-code lookup                                                   */
/* ------------------------------------------------------------------ */

const STATE_ABBR_MAP: Record<string, string> = {
  Alabama: "AL", Alaska: "AK", Arizona: "AZ", Arkansas: "AR", California: "CA",
  Colorado: "CO", Connecticut: "CT", Delaware: "DE", Florida: "FL", Georgia: "GA",
  Hawaii: "HI", Idaho: "ID", Illinois: "IL", Indiana: "IN", Iowa: "IA",
  Kansas: "KS", Kentucky: "KY", Louisiana: "LA", Maine: "ME", Maryland: "MD",
  Massachusetts: "MA", Michigan: "MI", Minnesota: "MN", Mississippi: "MS",
  Missouri: "MO", Montana: "MT", Nebraska: "NE", Nevada: "NV",
  "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY",
  "North Carolina": "NC", "North Dakota": "ND", Ohio: "OH", Oklahoma: "OK",
  Oregon: "OR", Pennsylvania: "PA", "Rhode Island": "RI", "South Carolina": "SC",
  "South Dakota": "SD", Tennessee: "TN", Texas: "TX", Utah: "UT", Vermont: "VT",
  Virginia: "VA", Washington: "WA", "West Virginia": "WV", Wisconsin: "WI",
  Wyoming: "WY", "District of Columbia": "DC",
  AL: "AL", AK: "AK", AZ: "AZ", AR: "AR", CA: "CA", CO: "CO", CT: "CT",
  DE: "DE", FL: "FL", GA: "GA", HI: "HI", ID: "ID", IL: "IL", IN: "IN",
  IA: "IA", KS: "KS", KY: "KY", LA: "LA", ME: "ME", MD: "MD", MA: "MA",
  MI: "MI", MN: "MN", MS: "MS", MO: "MO", MT: "MT", NE: "NE", NV: "NV",
  NH: "NH", NJ: "NJ", NM: "NM", NY: "NY", NC: "NC", ND: "ND", OH: "OH",
  OK: "OK", OR: "OR", PA: "PA", RI: "RI", SC: "SC", SD: "SD", TN: "TN",
  TX: "TX", UT: "UT", VT: "VT", VA: "VA", WA: "WA", WV: "WV", WI: "WI",
  WY: "WY", DC: "DC", GU: "GU", PR: "PR", AS: "AS", VI: "VI", MP: "MP",
};

/* ------------------------------------------------------------------ */
/*  Data fetching                                                       */
/* ------------------------------------------------------------------ */

interface PfasSiteRow {
  id: string;
  state: string;
  installation_name: string;
  pfas_ppt: number;
  severity: string;
  source: string;
  data_year: number;
}

async function fetchPfasSites(): Promise<PfasSiteRow[]> {
  const supabase = getSupabase();
  const sb = supabase as unknown as {
    from: (table: string) => ReturnType<typeof supabase.from>;
  };

  const rows: PfasSiteRow[] = [];
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await sb
      .from("pfas_contamination_sites")
      .select("id,state,installation_name,pfas_ppt,severity,source,data_year")
      .order("pfas_ppt", { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(
      ...(data as unknown as Record<string, unknown>[]).map((d) => ({
        id: String(d.id),
        state: String(d.state),
        installation_name: String(d.installation_name),
        pfas_ppt: Number(d.pfas_ppt) || 0,
        severity: String(d.severity),
        source: String(d.source),
        data_year: Number(d.data_year) || 0,
      }))
    );
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return rows;
}

interface CancerRow {
  state: string;
  cancer_site: string;
  age_adjusted_rate: number;
  case_count: number | null;
}

async function fetchCancerIncidence(): Promise<CancerRow[]> {
  const supabase = getSupabase();
  const sb = supabase as unknown as {
    from: (table: string) => ReturnType<typeof supabase.from>;
  };
  const { data, error } = await sb
    .from("cancer_incidence")
    .select("state,cancer_site,age_adjusted_rate,case_count")
    .in("cancer_site", ["Kidney and Renal Pelvis", "Urinary Bladder"]);

  if (error) throw error;
  return ((data ?? []) as unknown as Record<string, unknown>[]).map((d) => ({
    state: String(d.state),
    cancer_site: String(d.cancer_site),
    age_adjusted_rate: Number(d.age_adjusted_rate) || 0,
    case_count: d.case_count != null ? Number(d.case_count) : null,
  }));
}

interface PiRow {
  state: string;
  composite_score: number | null;
}

async function fetchPiScores(): Promise<PiRow[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("pi_viability_scores")
    .select("state,composite_score");

  if (error) throw error;
  return (data ?? []) as PiRow[];
}

interface JudicialRow {
  state: string;
  county: string;
  orientation: string;
}

async function fetchJudicialProfiles(): Promise<JudicialRow[]> {
  const supabase = getSupabase();
  const sb = supabase as unknown as {
    from: (table: string) => ReturnType<typeof supabase.from>;
  };
  const { data, error } = await sb
    .from("judicial_profiles")
    .select("state,county,orientation");

  if (error) throw error;
  return (data ?? []) as unknown as JudicialRow[];
}

/* ------------------------------------------------------------------ */
/*  Aggregation                                                         */
/* ------------------------------------------------------------------ */

function normalize(value: number, min: number, max: number): number {
  if (max === min) return 50;
  return ((value - min) / (max - min)) * 100;
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                      */
/* ------------------------------------------------------------------ */

export default async function PfasContaminationPage() {
  let pfasSites: PfasSiteRow[] = [];
  let cancerRows: CancerRow[] = [];
  let piScores: PiRow[] = [];
  let judicialRows: JudicialRow[] = [];

  try {
    [pfasSites, cancerRows, piScores, judicialRows] = await Promise.all([
      fetchPfasSites(),
      fetchCancerIncidence(),
      fetchPiScores(),
      fetchJudicialProfiles(),
    ]);
  } catch {
    // Gracefully degrade — render empty state
  }

  // Build state-level aggregation for pfas
  const stateAgg = new Map<string, { siteCount: number; maxPpt: number; highCount: number; sites: PfasSiteRow[] }>();
  for (const site of pfasSites) {
    let entry = stateAgg.get(site.state);
    if (!entry) {
      entry = { siteCount: 0, maxPpt: 0, highCount: 0, sites: [] };
      stateAgg.set(site.state, entry);
    }
    entry.siteCount++;
    if (site.pfas_ppt > entry.maxPpt) entry.maxPpt = site.pfas_ppt;
    if (site.pfas_ppt > 10000) entry.highCount++;
    entry.sites.push(site);
  }

  // Build cancer data by state
  const cancerByState = new Map<string, { kidney: number; bladder: number }>();
  for (const row of cancerRows) {
    const abbr = STATE_ABBR_MAP[row.state] ?? row.state;
    let entry = cancerByState.get(abbr);
    if (!entry) entry = { kidney: 0, bladder: 0 };
    if (row.cancer_site === "Kidney and Renal Pelvis") entry.kidney = row.age_adjusted_rate;
    if (row.cancer_site === "Urinary Bladder") entry.bladder = row.age_adjusted_rate;
    cancerByState.set(abbr, entry);
  }

  // Build PI scores by state
  const piByState = new Map<string, number>();
  for (const p of piScores) {
    if (p.composite_score != null) {
      piByState.set(p.state, p.composite_score);
    }
  }

  // Build judicial orientation by state
  const judicialByState = new Map<string, string>();
  for (const j of judicialRows) {
    const abbr = STATE_ABBR_MAP[j.state] ?? j.state;
    // Take the most common orientation per state
    const existing = judicialByState.get(abbr);
    if (!existing) judicialByState.set(abbr, j.orientation);
  }

  // Compute composite targeting scores
  const stateEntries = Array.from(stateAgg.entries());
  const highCounts = stateEntries.map(([, v]) => v.highCount);
  const highMin = Math.min(...highCounts, 0);
  const highMax = Math.max(...highCounts, 1);

  const kidneyRates = Array.from(cancerByState.values()).map((v) => v.kidney).filter((v) => v > 0);
  const kidneyMin = Math.min(...kidneyRates, 0);
  const kidneyMax = Math.max(...kidneyRates, 1);

  const bladderRates = Array.from(cancerByState.values()).map((v) => v.bladder).filter((v) => v > 0);
  const bladderMin = Math.min(...bladderRates, 0);
  const bladderMax = Math.max(...bladderRates, 1);

  const piValues = Array.from(piByState.values());
  const piMin = Math.min(...piValues, 0);
  const piMax = Math.max(...piValues, 1);

  const crossRefStates = stateEntries.map(([state, agg]) => {
    const cancer = cancerByState.get(state) ?? { kidney: 0, bladder: 0 };
    const pi = piByState.get(state) ?? 50;
    const judicial = judicialByState.get(state) ?? "Unknown";

    const contamNorm = normalize(agg.highCount, highMin, highMax);
    const kidneyNorm = cancer.kidney > 0 ? normalize(cancer.kidney, kidneyMin, kidneyMax) : 50;
    const bladderNorm = cancer.bladder > 0 ? normalize(cancer.bladder, bladderMin, bladderMax) : 50;
    const cancerNorm = (kidneyNorm + bladderNorm) / 2;
    const piNorm = normalize(pi, piMin, piMax);
    const judicialScore = judicial === "Liberal" ? 80 : judicial === "Moderate" ? 60 : 40;

    const composite = contamNorm * 0.30 + cancerNorm * 0.25 + piNorm * 0.25 + judicialScore * 0.20;

    return {
      state,
      siteCount: agg.siteCount,
      highContamSites: agg.highCount,
      maxPpt: agg.maxPpt,
      kidneyRate: cancer.kidney,
      bladderRate: cancer.bladder,
      piScore: pi,
      judicial,
      compositeScore: composite,
    };
  });

  crossRefStates.sort((a, b) => b.compositeScore - a.compositeScore);

  // Summary stats
  const totalSites = pfasSites.length;
  const aboveEpa = pfasSites.filter((s) => s.pfas_ppt > 4).length;
  const above10k = pfasSites.filter((s) => s.pfas_ppt > 10000).length;
  const highestSite = pfasSites.length > 0 ? pfasSites[0] : null;

  // Top 25 most contaminated
  const top25 = pfasSites.slice(0, 25);

  // State ranking
  const stateRanking = stateEntries
    .map(([state, agg]) => ({ state, ...agg }))
    .sort((a, b) => b.maxPpt - a.maxPpt);

  // Unique states for dropdown
  const uniqueStates = Array.from(stateAgg.keys()).sort();

  // Sites mapped for client
  const sitesForClient = pfasSites.map((s) => ({
    id: s.id,
    state: s.state,
    installation_name: s.installation_name,
    pfas_ppt: s.pfas_ppt,
    severity: s.severity,
  }));

  const pageData: PfasPageData = {
    sites: sitesForClient,
    summary: {
      totalSites,
      aboveEpa,
      aboveEpaPct: totalSites > 0 ? ((aboveEpa / totalSites) * 100).toFixed(1) : "0",
      above10k,
      highestReading: highestSite?.pfas_ppt ?? 0,
      highestSiteName: highestSite?.installation_name ?? "N/A",
      highestSiteState: highestSite?.state ?? "N/A",
    },
    top25: top25.map((s, i) => ({
      rank: i + 1,
      installation_name: s.installation_name,
      state: s.state,
      pfas_ppt: s.pfas_ppt,
      severity: s.severity,
    })),
    stateRanking: stateRanking.map((s) => ({
      state: s.state,
      siteCount: s.siteCount,
      maxPpt: s.maxPpt,
      highCount: s.highCount,
    })),
    uniqueStates,
    crossRefStates: crossRefStates.map((s, i) => ({
      ...s,
      rank: i + 1,
      isPriority: i < 10,
    })),
    cancerByState: Object.fromEntries(cancerByState),
    piByState: Object.fromEntries(piByState),
    judicialByState: Object.fromEntries(judicialByState),
  };

  const topCrossRefStates = crossRefStates
    .slice(0, 5)
    .map((s) => s.state);

  return (
    <>
      <PfasClient data={pageData} />
      <AskAIPanel
        pageContext={{
          pageName: "PFAS Contamination Intelligence",
          pageDescription:
            "PFAS contamination levels at 500+ U.S. military installations — geographic targeting tool for AFFF plaintiff recruitment.",
          dataSummary: `Total Sites: ${totalSites}. Above EPA Limit (4 ppt): ${aboveEpa} (${totalSites > 0 ? ((aboveEpa / totalSites) * 100).toFixed(1) : "0"}%). Extreme Contamination (>10,000 ppt): ${above10k}. Highest Reading: ${highestSite ? `${highestSite.pfas_ppt.toLocaleString()} ppt at ${highestSite.installation_name}, ${highestSite.state}` : "N/A"}. States with sites: ${uniqueStates.length}. Top priority markets (by composite targeting score): ${topCrossRefStates.join(", ")}. Composite score factors: contamination density (30%), cancer incidence (25%), PI viability (25%), judicial climate (20%). Cross-referenced with cancer incidence (kidney & bladder), PI viability scores, and judicial profiles.`,
        }}
      />
    </>
  );
}
