#!/usr/bin/env npx tsx
/**
 * sync-fars-data.ts
 *
 * Codegen: reads state_crash_statistics from Supabase (FARS source) and
 * writes the 4 FARS fatality fields plus derived alcoholRelatedPct directly
 * into all web/lib/state-config/<state>.ts static-config files.
 *
 * Supabase is the single source of truth for:
 *   totalFatalities, ruralFatalities, urbanFatalities,
 *   alcoholRelatedFatalities, alcoholRelatedPct
 *
 * Re-runnable: a second run with no Supabase changes produces a no-op diff.
 *
 * SCHEMA NOTE: state_crash_statistics has no is_final / vintage column.
 * Labels are written as "FARS {year}" without final/preliminary qualifier.
 * A follow-up PR should add a `is_final` boolean to the table.
 *
 * Uses native fetch (Node 18+) — no SDK dependency, runs from repo root.
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     npx tsx scripts/sync-fars-data.ts
 *   npx tsx scripts/sync-fars-data.ts --dry-run
 *
 * Env vars:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join, basename, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DRY_RUN = process.argv.includes("--dry-run");
// Resolve config dir relative to this script's location (safe vs cwd)
const CONFIG_DIR = join(__dirname, "../web/lib/state-config");

// ---------------------------------------------------------------------------
// State mappings
// ---------------------------------------------------------------------------

/** Map from TS filename slug → USPS 2-letter state code */
const SLUG_TO_CODE: Record<string, string> = {
  colorado:         "CO",
  illinois:         "IL",
  indiana:          "IN",
  kentucky:         "KY",
  louisiana:        "LA",
  maryland:         "MD",
  massachusetts:    "MA",
  michigan:         "MI",
  minnesota:        "MN",
  missouri:         "MO",
  "new-york":       "NY",
  "north-carolina": "NC",
  ohio:             "OH",
  pennsylvania:     "PA",
  "south-carolina": "SC",
  tennessee:        "TN",
  texas:            "TX",
  wisconsin:        "WI",
};

/**
 * Tier 2 states: all 4 FARS fields were placeholder zeros/nulls when this
 * script first ran. For these, we also update reportYear and sourceLabel.
 * Detected by totalFatalities === 0 in the file at time of first sync.
 */
const TIER2_CODES = new Set<string>([
  "CO", "IN", "KY", "LA", "MD", "MA", "MN", "MO", "SC", "WI",
]);

// ---------------------------------------------------------------------------
// Supabase fetch
// ---------------------------------------------------------------------------

interface FarsRow {
  state_code: string;
  year: number;
  total_fatalities: number;
  rural_fatalities: number | null;
  urban_fatalities: number | null;
  alcohol_related_fatalities: number | null;
}

async function fetchFarsData(): Promise<Record<string, FarsRow>> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error(
      "ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.\n" +
      "  Export them or use: NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx ...",
    );
    process.exit(1);
  }

  const targetCodes = Object.values(SLUG_TO_CODE);
  const cols = "state_code,year,total_fatalities,rural_fatalities,urban_fatalities,alcohol_related_fatalities";

  // Supabase PostgREST — native fetch, no SDK needed
  const url = new URL(`${supabaseUrl}/rest/v1/state_crash_statistics`);
  url.searchParams.set("select", cols);
  url.searchParams.set("state_code", `in.(${targetCodes.join(",")})`);
  url.searchParams.set("total_fatalities", "not.is.null");
  url.searchParams.set("order", "state_code.asc,year.desc");

  const resp = await fetch(url.toString(), {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Accept: "application/json",
    },
  });

  if (!resp.ok) {
    const body = await resp.text();
    console.error(`Supabase REST error ${resp.status}: ${body}`);
    process.exit(1);
  }

  const rows: FarsRow[] = await resp.json();

  // Take only the most-recent year per state (rows already ordered year DESC)
  const byState: Record<string, FarsRow> = {};
  for (const row of rows) {
    if (!byState[row.state_code]) {
      byState[row.state_code] = row;
    }
  }

  return byState;
}

// ---------------------------------------------------------------------------
// Per-field replacement
// ---------------------------------------------------------------------------

interface ReplaceResult {
  content: string;
  /** null = value unchanged (no-op) or field not found */
  logLine: string | null;
  /** true if field regex didn't match at all */
  notFound?: boolean;
}

/**
 * Replaces one field in the TypeScript source content.
 *
 * Matches lines of the form (with optional inline comment):
 *   <indent>fieldName: <null|number>,  [// existing comment]
 *
 * Replacement:
 *   <indent>fieldName: <newValue>, // <comment>
 *
 * Returns original content if the value is already correct (idempotent).
 */
function replaceField(
  content: string,
  fieldName: string,
  newValue: string,
  comment: string,
): ReplaceResult {
  // Pattern explanation:
  //   ^                  — start of line (multiline)
  //   ([ \t]+fieldName:\s*) — indentation + field name + colon + whitespace
  //   (null|-?\d+(?:[._]\d+)*) — null, or integer/decimal (with _ separators)
  //   (,\s*(?:\/\/[^\n]*)?)$  — comma, optional trailing comment, end of line
  const pattern = new RegExp(
    `^([ \\t]+${fieldName}:\\s*)(null|-?\\d+(?:[._]\\d+)*)(,\\s*(?:\\/\\/[^\\n]*)?)$`,
    "m",
  );

  const m = content.match(pattern);
  if (!m) {
    return { content, logLine: null, notFound: true };
  }

  const oldVal = m[2].replace(/_/g, ""); // strip numeric separators for comparison
  if (oldVal === newValue) {
    // Value is already correct — skip rewrite to avoid whitespace churn
    return { content, logLine: null };
  }

  const newLine = `${m[1]}${newValue}, // ${comment}`;
  return {
    content: content.replace(pattern, newLine),
    logLine: `  ${fieldName}: ${oldVal} → ${newValue}  [${comment}]`,
  };
}

// ---------------------------------------------------------------------------
// Per-file processing
// ---------------------------------------------------------------------------

interface FileResult {
  changed: boolean;
  log: string[];
}

function processFile(
  filePath: string,
  stateCode: string,
  row: FarsRow,
): FileResult {
  let content = readFileSync(filePath, "utf-8");
  const log: string[] = [];
  const yearLabel = `FARS ${row.year}`;

  // ── Downgrade guard ───────────────────────────────────────────────────────
  // For original states (non-Tier-2), check that Supabase data isn't older.
  // Tier 2 states have reportYear=2023 as a placeholder so we skip the guard.
  if (!TIER2_CODES.has(stateCode)) {
    const ryMatch = content.match(/\breportYear:\s*(\d+)/);
    const existingYear = ryMatch ? parseInt(ryMatch[1]) : 0;
    if (row.year < existingYear) {
      log.push(
        `SKIP [downgrade guard]: Supabase year ${row.year} < existing ` +
        `reportYear ${existingYear} — see FOLLOW_UPS`,
      );
      return { changed: false, log };
    }
  }

  // ── 1. totalFatalities ────────────────────────────────────────────────────
  const r1 = replaceField(content, "totalFatalities", String(row.total_fatalities), yearLabel);
  if (r1.notFound) log.push(`  WARN: totalFatalities field not found in ${filePath}`);
  else { content = r1.content; if (r1.logLine) log.push(r1.logLine); }

  // ── 2. ruralFatalities ────────────────────────────────────────────────────
  const ruralVal = row.rural_fatalities !== null ? String(row.rural_fatalities) : "null";
  const r2 = replaceField(content, "ruralFatalities", ruralVal, yearLabel);
  if (r2.notFound) log.push(`  WARN: ruralFatalities field not found`);
  else { content = r2.content; if (r2.logLine) log.push(r2.logLine); }

  // ── 3. urbanFatalities ────────────────────────────────────────────────────
  const urbanVal = row.urban_fatalities !== null ? String(row.urban_fatalities) : "null";
  const r3 = replaceField(content, "urbanFatalities", urbanVal, yearLabel);
  if (r3.notFound) log.push(`  WARN: urbanFatalities field not found`);
  else { content = r3.content; if (r3.logLine) log.push(r3.logLine); }

  // ── 4. alcoholRelatedFatalities ───────────────────────────────────────────
  const alcoholVal =
    row.alcohol_related_fatalities !== null
      ? String(row.alcohol_related_fatalities)
      : "null";
  const r4 = replaceField(content, "alcoholRelatedFatalities", alcoholVal, yearLabel);
  if (r4.notFound) log.push(`  WARN: alcoholRelatedFatalities field not found`);
  else { content = r4.content; if (r4.logLine) log.push(r4.logLine); }

  // ── 5. alcoholRelatedPct (derived) ────────────────────────────────────────
  if (row.alcohol_related_fatalities !== null && row.total_fatalities > 0) {
    const pct =
      Math.round((row.alcohol_related_fatalities / row.total_fatalities) * 1000) / 10;
    const pctComment = `${row.alcohol_related_fatalities} / ${row.total_fatalities} ${yearLabel}`;
    const r5 = replaceField(content, "alcoholRelatedPct", String(pct), pctComment);
    if (r5.notFound) log.push(`  WARN: alcoholRelatedPct field not found`);
    else { content = r5.content; if (r5.logLine) log.push(r5.logLine); }
  }

  // ── 6. reportYear + sourceLabel (Tier 2 only) ────────────────────────────
  if (TIER2_CODES.has(stateCode)) {
    // reportYear: first occurrence in file targets trafficStats block
    const ryPat = /^([ \t]+reportYear:\s*)(\d+)(,\s*(?:\/\/[^\n]*)?)$/m;
    const ryMatch = content.match(ryPat);
    if (ryMatch && parseInt(ryMatch[2]) !== row.year) {
      content = content.replace(ryPat, `$1${row.year},`);
      log.push(`  reportYear: ${ryMatch[2]} → ${row.year}`);
    }

    // sourceLabel (unique to trafficStats)
    const slPat = /^([ \t]+sourceLabel:\s*)"([^"]*)"(,\s*(?:\/\/[^\n]*)?)$/m;
    const slMatch = content.match(slPat);
    if (slMatch && slMatch[2] !== `FARS ${row.year}`) {
      content = content.replace(slPat, `$1"FARS ${row.year}",`);
      log.push(`  sourceLabel: "${slMatch[2]}" → "FARS ${row.year}"`);
    }
  }

  const actuallyChanged = content !== readFileSync(filePath, "utf-8");
  if (actuallyChanged && !DRY_RUN) {
    writeFileSync(filePath, content, "utf-8");
  }

  return { changed: actuallyChanged, log };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log(`\nsync-fars-data${DRY_RUN ? " [DRY RUN]" : ""}\n`);

  console.log("Fetching state_crash_statistics from Supabase...");
  const farsByState = await fetchFarsData();
  const sampleYear = Object.values(farsByState)[0]?.year ?? "?";
  console.log(
    `Loaded ${Object.keys(farsByState).length} states (most-recent year: ${sampleYear})\n`,
  );

  const files = readdirSync(CONFIG_DIR)
    .filter((f) => f.endsWith(".ts") && !f.startsWith("_") && f !== "index.ts")
    .sort();

  let updated = 0;
  let noOp    = 0;
  let skipped = 0;
  const warnings: string[] = [];

  for (const file of files) {
    const slug      = basename(file, ".ts");
    const stateCode = SLUG_TO_CODE[slug];

    if (!stateCode) {
      warnings.push(`${file}: no slug→code mapping — skipping`);
      skipped++;
      continue;
    }

    const row = farsByState[stateCode];
    if (!row) {
      warnings.push(`${stateCode}: no Supabase row — skipping`);
      skipped++;
      continue;
    }

    const filePath = join(CONFIG_DIR, file);
    const { changed, log } = processFile(filePath, stateCode, row);

    if (log.length === 0) {
      noOp++;
    } else if (log[0].startsWith("SKIP")) {
      console.log(`${stateCode} (${file}):`);
      for (const l of log) console.log(l);
      warnings.push(`${stateCode}: ${log[0]}`);
      skipped++;
    } else {
      const verb = DRY_RUN ? "would update" : "updated";
      console.log(`${stateCode} (${file}) — ${verb}:`);
      for (const l of log) console.log(l);
      if (changed || DRY_RUN) updated++;
      else noOp++;
    }
  }

  console.log(`\n${"─".repeat(60)}`);
  console.log(`Updated: ${updated}  No-op: ${noOp}  Skipped: ${skipped}`);

  if (warnings.length) {
    console.log("\nWarnings / FOLLOW_UPS:");
    for (const w of warnings) console.log(`  ${w}`);
  }

  if (DRY_RUN) {
    console.log("\n[DRY RUN] No files written.");
  }

  // FOLLOW_UPS summary
  console.log(`
FOLLOW_UPS:
  1. No is_final/vintage column in state_crash_statistics. Labels written as
     "FARS {year}" without final/preliminary qualifier. Recommend adding
     is_final BOOLEAN to the table and re-running this script to add labels.
  2. Original states (IL, MI, NC, NY, OH, PA, TN, TX) retain their existing
     sourceLabel (state DOT source) because those blocks contain non-FARS fields
     (totalCrashes, motorcycleFatalities, speedRelated, etc.). The 4 FARS fields
     are identified by inline // FARS {year} comments instead.
  3. Tier 2 placeholder block comments ("to be filled with real FARS/X figures")
     were not removed — clean those up in a follow-up pass.
  4. Displaced non-FARS sources for the 4 fields:
     - NC alcoholRelatedFatalities: 377 (NCDMV 2023) → FARS 2024
     - NC totalFatalities: 1686 (NCDMV 2023) → FARS 2024
     - MI alcoholRelatedFatalities: 297 (MSP CJIC 2023) → FARS 2024
     - NY all 4 fields (ITSMR NY 2023) → FARS 2024
     - OH totalFatalities/rural/urban (OSHP 2024) → FARS 2024
     - PA alcoholRelatedFatalities: 244 (PennDOT 2024) → FARS 2024
     - TN all 4 fields (TDOSHS 2024) → FARS 2024
     - TX all 4 fields (TxDOT 2024) → FARS 2024
     Prior values preserved in git history.
  5. TX/TN rural/urban methodology note: FARS uses federal urban/rural classification
     (urbanized area boundaries); TxDOT and TDOSHS use different definitions.
     The large rural/urban delta vs. prior values is expected, not a data error.
`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
