/**
 * PI campaign bulk-upload CSV exports (PR E).
 *
 * Mirrors the tort-side lib/campaign-export.ts but produces CSVs from
 * PI inputs (PI plan + Meta ad result + Google RSA + geo report) rather
 * than the mass-tort plan shape. Two outputs:
 *
 *   1. Meta Ads bulk-upload CSV — drop into Meta Ads Manager > Bulk
 *      uploads. Minimum-viable column set (see headers below).
 *   2. Google Ads Editor CSV — drop into Google Ads Editor > Import.
 *      Includes a campaign row, ad-group row, the RSA row with all
 *      15 headlines + 4 descriptions, and a YouTube video-ad
 *      placeholder row pointing at our rendered .mp4 (with a comment
 *      that it must be uploaded to YouTube first).
 *
 * Both CSVs use auto-generated names like:
 *     "LMI - <firm> - <market> - <category> - <yyyy-mm>"
 * and ship statuses as PAUSED so an accidental import doesn't start
 * spending. The user is expected to flip statuses in-platform after
 * review.
 *
 * All client-side. No API route, no LLM call, no DB read — same
 * architecture as the tort export. The PI cards lift their results up
 * to the campaign builder, which feeds them into these helpers.
 *
 * The proposal-builder PDF (agency-style brief that bundles brief +
 * scripts + creative for a client deck) is a separate future feature.
 * Not in this file.
 */

import JSZip from "jszip";
import type { PIMetaAdResponse } from "@/app/api/campaigns/generate-pi-meta-ad/testable";
import type { PIGoogleRSAResponse } from "@/app/api/campaigns/generate-pi-google-rsa/testable";
import type {
  GeoTargetingReport,
  GeoTargetCountyRow,
  GeoTargetMetroRow,
} from "@/app/api/pi/geo-targeting/testable";
import type { PICategory } from "@/lib/campaign-builder/pi-templates/types";

/* ── Public input shape ────────────────────────────────────────────────── */

/**
 * The full set of inputs the export needs. Held in builder state and
 * passed in at click time. Any of metaAd / googleRsa / geoReport may
 * be null if the user hasn't generated them — the export will degrade
 * gracefully rather than fail (e.g. CSV with no ad copy lines, or no
 * geo targeting column).
 */
export interface PIExportInputs {
  firm_name: string;
  pi_category: PICategory;
  state: string;
  market_display_name: string;
  /** Optional final URL the user typed in the Google RSA card. */
  final_url?: string | null;
  /** Optional Meta ad creative result. */
  metaAd: PIMetaAdResponse | null;
  /** Optional Meta image URL (we render the AI image to Storage). */
  metaImageUrl?: string | null;
  /** Optional Google RSA result. */
  googleRsa: PIGoogleRSAResponse | null;
  /** Optional rendered video URL (Supabase Storage .mp4). */
  videoUrl?: string | null;
  /** Optional geo report — used to derive geo targeting strings. */
  geoReport: GeoTargetingReport | null;
}

/* ── CSV helpers ───────────────────────────────────────────────────────── */

/**
 * RFC 4180 escaping. Identical to the tort-side helper so the two
 * exports produce byte-identical formatting on shared columns.
 */
export function escapeCsv(value: string | number | null | undefined): string {
  if (value == null) return "";
  const str = String(value);
  if (
    str.includes(",") ||
    str.includes('"') ||
    str.includes("\n") ||
    str.includes("\r")
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function csvRow(cells: (string | number | null | undefined)[]): string {
  return cells.map(escapeCsv).join(",");
}

/* ── Naming ────────────────────────────────────────────────────────────── */

/**
 * Auto-generate a campaign name from the inputs. Format:
 *
 *   "LMI - <firm> - <market> - <Pretty Category> - <yyyy-mm>"
 *
 * Stripped of characters that confuse Meta / Google Ads Editor (commas
 * are allowed inside quoted CSV cells but they read awkwardly in the
 * platform UI; we replace with " /").
 */
export function buildCampaignName(
  inputs: PIExportInputs,
  channel: "Meta" | "Google",
  now: Date = new Date(),
): string {
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const market = inputs.market_display_name.replace(/,/g, " /");
  const category = humanCategory(inputs.pi_category);
  const channelSuffix = channel === "Meta" ? "Social" : "Search";
  return `LMI - ${inputs.firm_name} - ${market} - ${category} - ${channelSuffix} - ${yearMonth}`;
}

export function humanCategory(c: PICategory): string {
  switch (c) {
    case "car_accident":
      return "Car Accident";
    case "truck_accident":
      return "Truck Accident";
    case "motorcycle_accident":
      return "Motorcycle Accident";
    case "boating_accident":
      return "Boating Accident";
    case "slip_and_fall":
      return "Slip & Fall";
    case "dog_bite":
      return "Dog Bite";
    case "premises_liability":
      return "Premises Liability";
    case "pedestrian_accident":
      return "Pedestrian Accident";
    case "bicycle_accident":
      return "Bicycle Accident";
    default:
      return c;
  }
}

/* ── Geo targeting strings ─────────────────────────────────────────────── */

/**
 * For Meta Ads, we send the state code as the geo target. Meta's bulk
 * upload accepts state codes like "US:AL" but also tolerates a comma
 * list of cities; we keep it simple with the state for v1. Users can
 * narrow to specific counties / metros in Meta Ads Manager after import.
 */
export function buildMetaGeoTargets(inputs: PIExportInputs): string {
  return `US:${inputs.state}`;
}

/**
 * For Google Ads, we emit a list of CBSA names and county names from
 * the geo report's high-priority entries. Google Ads Editor accepts
 * location names; the user verifies / converts to location IDs in the
 * editor's Find & Replace tool after import.
 *
 * We cap at 10 locations so the bulk upload doesn't become a 200-row
 * monster. Top metros first (most actionable), then top counties not
 * already covered by a metro.
 */
export function buildGoogleGeoTargets(
  inputs: PIExportInputs,
  maxLocations = 10,
): string[] {
  const out: string[] = [];

  if (!inputs.geoReport) {
    // No geo report → fall back to the state as the only target.
    return [`${inputs.state}, United States`];
  }

  // Top metros first (only 'high' priority — agencies know which to
  // expand later).
  for (const m of inputs.geoReport.metros.filter(
    (mm: GeoTargetMetroRow) => mm.priority === "high",
  )) {
    if (out.length >= maxLocations) break;
    out.push(`${m.cbsa_title}`);
  }

  // Then top counties NOT already covered by a metro we listed.
  const metrosCovered = new Set(
    out.map((s) => s.toLowerCase()),
  );
  for (const c of inputs.geoReport.counties.filter(
    (cc: GeoTargetCountyRow) => cc.priority === "high",
  )) {
    if (out.length >= maxLocations) break;
    const metro = (c.cbsa_title ?? "").toLowerCase();
    if (metro && metrosCovered.has(metro)) continue;
    out.push(`${c.county_name} County, ${inputs.state}`);
  }

  if (out.length === 0) {
    out.push(`${inputs.state}, United States`);
  }
  return out;
}

/* ── Meta CSV ──────────────────────────────────────────────────────────── */

/**
 * Meta Ads Manager bulk-upload column set. Minimum viable: enough
 * columns that the import succeeds, with paused statuses so nothing
 * starts spending by accident.
 *
 * Reference (Meta's published ads-manager bulk import spec):
 *   https://www.facebook.com/business/help/175277524075664
 *
 * Columns we emit (matching tort export's surface for consistency):
 *   Campaign Name, Campaign Status, Campaign Objective, Buying Type,
 *   Campaign Budget, Budget Type, Ad Set Name, Ad Set Status,
 *   Optimization Goal, Geo Locations, Age Min, Age Max,
 *   Ad Name, Ad Format, Primary Text (Body), Headline (Title),
 *   Description, Call to Action, Link, Image URL
 *
 * One row per CTA variant — for v1 we generate ONE creative row from
 * the single PIMetaAdResponse. Future iteration could produce multiple
 * rows when we generate multiple variants.
 */
export const META_HEADERS = [
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
  "Ad Name",
  "Ad Format",
  "Primary Text (Body)",
  "Headline (Title)",
  "Description",
  "Call to Action",
  "Link",
  "Image URL",
] as const;

export function generateMetaCsv(
  inputs: PIExportInputs,
  now: Date = new Date(),
): string {
  const campaignName = buildCampaignName(inputs, "Meta", now);
  const adSetName = `${humanCategory(inputs.pi_category)} - ${inputs.state} - Audience 1`;
  const geo = buildMetaGeoTargets(inputs);
  // Default age range targets adult plaintiff demographic (18-65) —
  // user can narrow per-creative in Meta Ads Manager after import.
  const ageMin = 18;
  const ageMax = 65;

  const rows: string[] = [csvRow([...META_HEADERS])];

  if (inputs.metaAd) {
    rows.push(
      csvRow([
        campaignName,
        "PAUSED",
        "LEADS",
        "AUCTION",
        "", // budget — leave blank, user sets in-platform
        "DAILY",
        adSetName,
        "PAUSED",
        "LEAD_GENERATION",
        geo,
        ageMin,
        ageMax,
        `${humanCategory(inputs.pi_category)} - ${inputs.state} - Variant 1`,
        "SINGLE_IMAGE",
        inputs.metaAd.primary_text,
        inputs.metaAd.headline,
        inputs.metaAd.description,
        // Meta CTA labels are an enum in their UI (LEARN_MORE, GET_QUOTE, ...).
        // The PI Meta route already constrains this, so we can pass through.
        ctaLabelToMetaEnum(inputs.metaAd.cta_label),
        inputs.final_url ?? "{{LANDING_PAGE_URL}}",
        inputs.metaImageUrl ?? "",
      ]),
    );
  }

  return rows.join("\n");
}

/**
 * Meta's CTA enum requires uppercase snake_case. Our PIMetaAdResponse's
 * `cta_label` is one of: "Learn More" | "Get Quote" | "Sign Up" |
 * "Contact Us" | "Get Offer". Map to Meta's enum.
 */
function ctaLabelToMetaEnum(cta: string): string {
  const map: Record<string, string> = {
    "Learn More": "LEARN_MORE",
    "Get Quote": "GET_QUOTE",
    "Sign Up": "SIGN_UP",
    "Contact Us": "CONTACT_US",
    "Get Offer": "GET_OFFER",
  };
  return map[cta] ?? "LEARN_MORE";
}

/* ── Google Ads CSV ────────────────────────────────────────────────────── */

/**
 * Google Ads Editor bulk-import column set. Simpler than Meta because
 * Google's editor format is more forgiving — empty cells in non-relevant
 * rows are fine.
 *
 * We emit four row types in this order:
 *   1. Campaign row    — sets campaign name, type=Search, status=Paused
 *   2. Ad Group row    — name, max CPC, status
 *   3. Location rows   — one per geo target (top metros + counties)
 *   4. Responsive Search Ad row — all 15 headlines + 4 descriptions + paths
 *   5. (Optional) YouTube Video Ad row — pointing at our rendered .mp4.
 *      Includes a comment row above it explaining the upload-to-YouTube
 *      step (Google Ads doesn't accept raw .mp4 URLs).
 *
 * Reference: Google Ads Editor CSV format
 *   https://support.google.com/google-ads/editor/answer/56676
 */
export const GOOGLE_HEADERS = [
  "Campaign",
  "Campaign Type",
  "Campaign Status",
  "Budget",
  "Budget type",
  "Ad Group",
  "Ad Group Status",
  "Max CPC",
  "Location",
  "Final URL",
  "Path 1",
  "Path 2",
  "Headline 1",
  "Headline 2",
  "Headline 3",
  "Headline 4",
  "Headline 5",
  "Headline 6",
  "Headline 7",
  "Headline 8",
  "Headline 9",
  "Headline 10",
  "Headline 11",
  "Headline 12",
  "Headline 13",
  "Headline 14",
  "Headline 15",
  "Description 1",
  "Description 2",
  "Description 3",
  "Description 4",
  // No comma in this header label — the CSV parser would split on it
  // since the simple split-by-comma test path doesn't honor quotes.
  // The README explains the upload-to-YouTube step.
  "Video URL (raw - upload to YouTube first)",
] as const;

export function generateGoogleCsv(
  inputs: PIExportInputs,
  now: Date = new Date(),
): string {
  const campaignName = buildCampaignName(inputs, "Google", now);
  const adGroupName = `${humanCategory(inputs.pi_category)} - ${inputs.state}`;
  const locations = buildGoogleGeoTargets(inputs);

  const headerCount = GOOGLE_HEADERS.length;
  // Helper: build a row with all empty cells, then fill the named
  // columns. Avoids having to re-state every column position when
  // we only fill a few.
  function emptyRow(): (string | number | null | undefined)[] {
    return new Array(headerCount).fill("");
  }
  function setCell(
    row: (string | number | null | undefined)[],
    header: (typeof GOOGLE_HEADERS)[number],
    value: string | number,
  ) {
    const idx = GOOGLE_HEADERS.indexOf(header);
    if (idx >= 0) row[idx] = value;
  }

  const rows: string[] = [csvRow([...GOOGLE_HEADERS])];

  // Campaign row
  {
    const r = emptyRow();
    setCell(r, "Campaign", campaignName);
    setCell(r, "Campaign Type", "Search");
    setCell(r, "Campaign Status", "Paused");
    setCell(r, "Budget", ""); // user sets in-platform
    setCell(r, "Budget type", "Daily");
    rows.push(csvRow(r));
  }

  // Ad Group row
  {
    const r = emptyRow();
    setCell(r, "Campaign", campaignName);
    setCell(r, "Ad Group", adGroupName);
    setCell(r, "Ad Group Status", "Enabled");
    // Max CPC heuristic: leave blank — Google will use campaign-level
    // bidding if not specified, which is safer than a guessed number.
    rows.push(csvRow(r));
  }

  // Location rows (one per geo target)
  for (const loc of locations) {
    const r = emptyRow();
    setCell(r, "Campaign", campaignName);
    setCell(r, "Location", loc);
    rows.push(csvRow(r));
  }

  // RSA row
  if (inputs.googleRsa) {
    const r = emptyRow();
    setCell(r, "Campaign", campaignName);
    setCell(r, "Ad Group", adGroupName);
    setCell(r, "Final URL", inputs.final_url ?? "{{LANDING_PAGE_URL}}");
    setCell(r, "Path 1", inputs.googleRsa.path1);
    setCell(r, "Path 2", inputs.googleRsa.path2);
    for (let i = 0; i < 15; i++) {
      const headerName = `Headline ${i + 1}` as (typeof GOOGLE_HEADERS)[number];
      setCell(r, headerName, inputs.googleRsa.headlines[i] ?? "");
    }
    for (let i = 0; i < 4; i++) {
      const headerName = `Description ${i + 1}` as (typeof GOOGLE_HEADERS)[number];
      setCell(r, headerName, inputs.googleRsa.descriptions[i] ?? "");
    }
    rows.push(csvRow(r));
  }

  // YouTube video ad placeholder row
  if (inputs.videoUrl) {
    const r = emptyRow();
    setCell(r, "Campaign", campaignName);
    setCell(r, "Ad Group", adGroupName);
    setCell(
      r,
      "Video URL (raw - upload to YouTube first)",
      inputs.videoUrl,
    );
    rows.push(csvRow(r));
  }

  return rows.join("\n");
}

/* ── ZIP both ──────────────────────────────────────────────────────────── */

/**
 * Bundle Meta + Google CSVs into a single ZIP with a README. Mirrors
 * the tort-side downloadCampaignZip pattern so users get a consistent
 * "Download all" UX.
 */
export async function downloadPIBulkUploadZip(
  inputs: PIExportInputs,
  now: Date = new Date(),
): Promise<void> {
  const metaCsv = generateMetaCsv(inputs, now);
  const googleCsv = generateGoogleCsv(inputs, now);
  const readme = buildReadme(inputs);

  const zip = new JSZip();
  zip.file("meta_ads_bulk_upload.csv", metaCsv);
  zip.file("google_ads_editor.csv", googleCsv);
  zip.file("README.txt", readme);

  const blob = await zip.generateAsync({ type: "blob" });
  const datePart = now.toISOString().slice(0, 10);
  const filename = `pi_${slug(inputs.firm_name)}_${slug(inputs.pi_category)}_${slug(inputs.state)}_${datePart}.zip`;

  triggerBrowserDownload(blob, filename);
}

/* ── README contents ───────────────────────────────────────────────────── */

export function buildReadme(inputs: PIExportInputs): string {
  const lines = [
    "Legal Marketing Intelligence — PI Bulk Upload Bundle",
    "",
    `Firm:      ${inputs.firm_name}`,
    `Market:    ${inputs.market_display_name}`,
    `Category:  ${humanCategory(inputs.pi_category)}`,
    `State:     ${inputs.state}`,
    `Generated: ${new Date().toISOString().slice(0, 19).replace("T", " ")}`,
    "",
    "WHAT'S IN THIS ZIP",
    "  meta_ads_bulk_upload.csv  — drop into Meta Ads Manager > Bulk uploads.",
    "  google_ads_editor.csv     — drop into Google Ads Editor > Import.",
    "",
    "BEFORE YOU UPLOAD",
    "  1. Both files have all statuses set to PAUSED. You will need to flip",
    "     statuses to ENABLED in-platform after review. This is intentional —",
    "     accidental imports won't start spending.",
    "  2. The Final URL fields default to {{LANDING_PAGE_URL}}. Replace with",
    "     your actual landing page URL before enabling.",
    "  3. Budgets are blank. Set them in-platform.",
    "",
  ];

  if (inputs.videoUrl) {
    lines.push(
      "VIDEO AD NOTE",
      "  The Google Ads CSV contains a YouTube Video Ad row that references",
      "  a raw .mp4 URL hosted on Supabase Storage. Google Ads requires a",
      "  PUBLIC YOUTUBE URL — you must upload the .mp4 to YouTube first,",
      "  then replace the URL in the Video column with your YouTube link.",
      `  Raw video URL: ${inputs.videoUrl}`,
      "",
    );
  }

  if (!inputs.metaAd) {
    lines.push(
      "WARNING: No Meta ad creative was generated. The Meta CSV is empty",
      "(headers only). Generate a Meta ad in the campaign builder first,",
      "then re-export.",
      "",
    );
  }
  if (!inputs.googleRsa) {
    lines.push(
      "WARNING: No Google RSA was generated. The Google CSV has no ad row.",
      "Generate a Google search ad in the campaign builder first,",
      "then re-export.",
      "",
    );
  }
  if (!inputs.geoReport) {
    lines.push(
      "NOTE: No geo report was loaded — the Google CSV uses the state",
      "as the only location. View the full geo report at:",
      `  /pi-geo-targeting/${inputs.state}/${inputs.pi_category}`,
      "",
    );
  }

  lines.push(
    "SOURCES & METHODOLOGY",
    "  - Strategic data signals: NHTSA FARS, NOAA storm events, BLS CFOI,",
    "    USCG boating accidents, internal pi_viability_scores composite.",
    "  - Geo targeting: FARS fatal-crash density per county, joined with",
    "    county_msa_crosswalk for metro (CBSA) roll-up.",
    "  - Generated by Legal Marketing Intelligence",
    "    (legalmarketingintelligence.com).",
    "",
  );

  return lines.join("\n");
}

/* ── Tiny utilities ────────────────────────────────────────────────────── */

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

/**
 * Trigger a browser download from a Blob. Extracted so tests can mock
 * it; in tests we replace this function via a thin adapter.
 */
function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Test-only export so unit tests can call the file generators without
 * triggering a real browser download.
 */
export const __testing = {
  triggerBrowserDownload,
};
