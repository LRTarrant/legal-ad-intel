import JSZip from "jszip";

/* ── Types matching campaign-builder-client.tsx ────────────────────────── */

interface CampaignPlan {
  tort_overview: {
    tort_name: string;
    lifecycle_phase: string;
    cpl_range: { low: number | null; high: number | null };
    cpa_range: { low: number | null; high: number | null };
    cpk_range: { low: number | null; high: number | null };
    lead_to_retainer_pct: number | null;
    latest_mdl: { title: string; date: string; summary: string | null } | null;
    trend_direction: "up" | "down" | "flat";
  };
  geo_recommendations: {
    state: string;
    population: number;
    incidence: number;
    saturation_score: number;
    opportunity_score: number;
    opportunity_level: "high" | "moderate" | "low";
  }[];
  relevant_dmas: { name: string; population: number }[];
  channel_mix: {
    primary: {
      channel: string;
      role: string;
      cost_pressure: string;
      competition_score: number | null;
      allocation_pct: number;
      recommendation: string;
    }[];
    secondary: {
      channel: string;
      role: string;
      cost_pressure: string;
      competition_score: number | null;
      allocation_pct: number;
      recommendation: string;
    }[];
    situational: {
      channel: string;
      role: string;
      cost_pressure: string;
      allocation_pct: number;
    }[];
    lifecycle_note: string;
  };
  audience_targeting: {
    age_bands: Record<string, number> | null;
    meta_targeting: {
      age_ranges: string[];
      interests: string[];
      demographics: string;
    };
    google_targeting: {
      keyword_themes: string[];
      audience_segments: string[];
    };
    state_specific_notes: string;
  };
  budget_projection: {
    monthly_budget: number;
    avg_cpl: number;
    expected_leads_per_month: number;
    lead_to_retainer_pct: number;
    expected_retainers_per_month: number;
    cost_per_kept_case: number | null;
    channel_split: {
      core: { label: string; amount: number; pct: number };
      secondary: { label: string; amount: number; pct: number };
      situational: { label: string; amount: number; pct: number };
    };
  } | null;
}

interface AiInsights {
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

export type { CampaignPlan, AiInsights };

/* ── CSV Helpers ───────────────────────────────────────────────────────── */

function escapeCSV(value: string | number | null | undefined): string {
  if (value == null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function csvRow(cells: (string | number | null | undefined)[]): string {
  return cells.map(escapeCSV).join(",");
}

/* ── Age parsing ───────────────────────────────────────────────────────── */

function parseAgeRange(ageRanges: string[]): { min: number; max: number } {
  let min = 18;
  let max = 65;
  for (const range of ageRanges) {
    const match = range.match(/(\d+)\s*-\s*(\d+)/);
    if (match) {
      const lo = parseInt(match[1], 10);
      const hi = parseInt(match[2], 10);
      if (lo < min) min = lo;
      if (hi > max) max = hi;
    }
  }
  return { min, max };
}

/* ── Meta CSV ──────────────────────────────────────────────────────────── */

export function generateMetaCSV(
  campaignData: CampaignPlan,
  aiInsights: AiInsights,
): string {
  const tort = campaignData.tort_overview.tort_name;
  const states = campaignData.geo_recommendations.map((g) => g.state);
  const stateAbbr = states.join(", ");
  const dailyBudget = campaignData.budget_projection
    ? (campaignData.budget_projection.monthly_budget / 30).toFixed(2)
    : "";

  const { min: ageMin, max: ageMax } = parseAgeRange(
    campaignData.audience_targeting.meta_targeting.age_ranges,
  );

  const interests = campaignData.audience_targeting.meta_targeting.interests.join("; ");

  const campaignName = `LMI - ${tort} - ${stateAbbr}`;
  const adSetName = `${tort} - ${stateAbbr} - Social`;

  const headers = [
    "Campaign Name",
    "Campaign Status",
    "Campaign Objective",
    "Buying Type",
    "Campaign Budget",
    "Budget Type",
    "Ad Set Name",
    "Ad Set Status",
    "Optimization Goal",
    "Geo Locations",
    "Age Min",
    "Age Max",
    "Interests",
    "Ad Name",
    "Ad Format",
    "Primary Text (Body)",
    "Headline (Title)",
    "Description",
    "Call to Action",
    "Link",
  ];

  const rows: string[] = [csvRow(headers)];

  const metaCopy = aiInsights.ad_copy.meta;
  const variantCount = Math.max(metaCopy.headlines.length, 1);
  const limit = Math.min(variantCount, 3);

  for (let i = 0; i < limit; i++) {
    const headline = metaCopy.headlines[i] ?? "";
    const body = metaCopy.body_options[i] ?? "";
    const cta = metaCopy.ctas[i] ?? "";
    const description = cta; // use CTA text as description line

    rows.push(
      csvRow([
        campaignName,
        "PAUSED",
        "LEADS",
        "AUCTION",
        dailyBudget,
        "DAILY",
        adSetName,
        "PAUSED",
        "LEAD_GENERATION",
        stateAbbr,
        ageMin,
        ageMax,
        interests,
        `${tort} - ${stateAbbr} - Variant ${i + 1}`,
        "SINGLE_IMAGE",
        body,
        headline,
        description,
        "LEARN_MORE",
        "{{LANDING_PAGE_URL}}",
      ]),
    );
  }

  return rows.join("\n");
}

/* ── Google Ads CSV ────────────────────────────────────────────────────── */

export function generateGoogleAdsCSV(
  campaignData: CampaignPlan,
  aiInsights: AiInsights,
): string {
  const tort = campaignData.tort_overview.tort_name;
  const states = campaignData.geo_recommendations.map((g) => g.state);
  const stateAbbr = states.join(", ");

  const campaignName = `LMI - ${tort} - ${stateAbbr} - Search`;
  const adGroupName = `${tort} - ${stateAbbr} - Core Keywords`;

  const dailyBudget = campaignData.budget_projection
    ? (campaignData.budget_projection.monthly_budget / 30).toFixed(2)
    : "";

  const maxCPC = campaignData.budget_projection
    ? Math.round(
        (campaignData.budget_projection.avg_cpl || 15) * 0.3,
      ).toString()
    : "15";

  const headers = [
    "Campaign",
    "Campaign Type",
    "Campaign Status",
    "Budget",
    "Budget type",
    "Ad Group",
    "Ad Group Status",
    "Max CPC",
    "Keyword",
    "Criterion Type",
    "Status",
    "Final URL",
    "Path 1",
    "Path 2",
    "Headline 1",
    "Headline 2",
    "Headline 3",
    "Headline 4",
    "Headline 5",
    "Description 1",
    "Description 2",
    "Description 3",
  ];

  const rows: string[] = [csvRow(headers)];

  // Row 1: Campaign row
  rows.push(
    csvRow([
      campaignName,
      "Search",
      "Paused",
      dailyBudget,
      "Daily",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ]),
  );

  // Row 2: Ad Group row
  rows.push(
    csvRow([
      campaignName,
      "",
      "",
      "",
      "",
      adGroupName,
      "Enabled",
      maxCPC,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ]),
  );

  // Keyword rows
  const keywords = campaignData.audience_targeting.google_targeting.keyword_themes;
  const highIntentPatterns = ["attorney", "lawyer", "lawsuit", "class action", "compensation", "am i eligible"];

  for (const kw of keywords) {
    const isHighIntent = highIntentPatterns.some((p) =>
      kw.toLowerCase().includes(p),
    );
    rows.push(
      csvRow([
        campaignName,
        "",
        "",
        "",
        "",
        adGroupName,
        "",
        "",
        kw,
        isHighIntent ? "Exact" : "Phrase",
        "Enabled",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ]),
    );
  }

  // Ad row (RSA)
  const gHeadlines = aiInsights.ad_copy.google_search.headlines;
  const gDescriptions = aiInsights.ad_copy.google_search.descriptions;

  const tortSlug = tort.toLowerCase().replace(/\s+/g, "-").slice(0, 15);
  const stateSlug = (states[0] ?? "").toLowerCase();

  rows.push(
    csvRow([
      campaignName,
      "",
      "",
      "",
      "",
      adGroupName,
      "",
      "",
      "",
      "",
      "Enabled",
      "{{LANDING_PAGE_URL}}",
      tortSlug,
      stateSlug,
      gHeadlines[0] ?? "",
      gHeadlines[1] ?? "",
      gHeadlines[2] ?? "",
      gHeadlines[3] ?? "",
      gHeadlines[4] ?? "",
      gDescriptions[0] ?? "",
      gDescriptions[1] ?? "",
      gDescriptions[2] ?? "",
    ]),
  );

  return rows.join("\n");
}

/* ── ZIP Download ──────────────────────────────────────────────────────── */

export async function downloadCampaignZip(
  campaignData: CampaignPlan,
  aiInsights: AiInsights,
): Promise<void> {
  const metaCSV = generateMetaCSV(campaignData, aiInsights);
  const googleCSV = generateGoogleAdsCSV(campaignData, aiInsights);

  const zip = new JSZip();
  zip.file("meta_ads_bulk_upload.csv", metaCSV);
  zip.file("google_ads_editor_upload.csv", googleCSV);

  const blob = await zip.generateAsync({ type: "blob" });

  const tort = campaignData.tort_overview.tort_name
    .toLowerCase()
    .replace(/\s+/g, "_");
  const states = campaignData.geo_recommendations
    .map((g) => g.state)
    .join("_")
    .toLowerCase();
  const date = new Date().toISOString().slice(0, 10);
  const filename = `${tort}_${states}_campaign_${date}.zip`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
