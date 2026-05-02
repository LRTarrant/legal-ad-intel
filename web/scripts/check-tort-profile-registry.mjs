#!/usr/bin/env node
/**
 * Build-time guard: every tort profile page under app/(app)/advertising/{slug}
 * must be registered on the Mass Tort Overview page (either as an active-MDL
 * pill in MDL_TORT_NAMES with hasFullProfile: true, or in the PRE_MDL_TORTS
 * watchlist).
 *
 * Run via `npm run check:tort-registry` or automatically as a `prebuild` hook.
 *
 * To opt a route out (non-tort tooling pages, dynamic segments, sub-tools that
 * live under another tort), add it to NON_TORT_ROUTES below. To register a
 * tort profile as a sub-tool of another tort that is already pilled, add it to
 * SUB_TOOL_ALIASES.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPO_WEB_ROOT = path.resolve(__dirname, "..");
const ADVERTISING_DIR = path.join(REPO_WEB_ROOT, "app/(app)/advertising");
const OVERVIEW_PAGE = path.join(
  REPO_WEB_ROOT,
  "app/(app)/mass-tort-overview/page.tsx"
);

/**
 * Routes under /advertising/ that are tooling/aggregate pages, not tort
 * profiles. These do not need overview pills.
 */
const NON_TORT_ROUTES = new Set([
  "[slug]", // dynamic catch-all for legacy slugs
  "advertisers",
  "channel-planner",
  "cost-benchmarks",
  "creatives",
  "exposure",
  "markets",
  "recall-watchlist",
  "saturation",
  "search-visibility",
  "torts",
  "trends",
]);

/**
 * Tort profile pages that are sub-tools of another already-pilled tort.
 * Map: sub-tool slug -> parent tort slug whose pill represents it on the
 * overview page.
 */
const SUB_TOOL_ALIASES = {
  "pfas-contamination": "afff-firefighting-foam", // AFFF / PFAS pill
};

function listAdvertisingRoutes() {
  if (!fs.existsSync(ADVERTISING_DIR)) {
    console.error(`Advertising directory not found: ${ADVERTISING_DIR}`);
    process.exit(2);
  }
  return fs
    .readdirSync(ADVERTISING_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

function readOverviewSource() {
  if (!fs.existsSync(OVERVIEW_PAGE)) {
    console.error(`Overview page not found: ${OVERVIEW_PAGE}`);
    process.exit(2);
  }
  return fs.readFileSync(OVERVIEW_PAGE, "utf8");
}

function extractRegisteredHrefs(source) {
  // Match every `href: "/advertising/<slug>"` literal in the overview file.
  // Covers both MDL_TORT_NAMES entries and PRE_MDL_TORTS entries.
  const hrefs = new Set();
  const regex = /href:\s*"\/advertising\/([a-z0-9-]+)"/g;
  let m;
  while ((m = regex.exec(source)) !== null) {
    hrefs.add(m[1]);
  }
  return hrefs;
}

function main() {
  const routes = listAdvertisingRoutes();
  const overviewSource = readOverviewSource();
  const registered = extractRegisteredHrefs(overviewSource);

  const missing = [];
  const orphaned = [];

  // Every tort profile route must be either:
  //   (a) NON_TORT_ROUTES (tooling)
  //   (b) SUB_TOOL_ALIASES (parent's pill represents it)
  //   (c) directly registered with an /advertising/<slug> href
  for (const slug of routes) {
    if (NON_TORT_ROUTES.has(slug)) continue;
    if (slug in SUB_TOOL_ALIASES) {
      const parent = SUB_TOOL_ALIASES[slug];
      if (!registered.has(parent)) {
        missing.push(
          `${slug} \u2192 expected parent "${parent}" to be registered, but it isn't`
        );
      }
      continue;
    }
    if (!registered.has(slug)) {
      missing.push(slug);
    }
  }

  // Catch the reverse case: registry references a route that doesn't exist.
  for (const slug of registered) {
    const routeExists = fs.existsSync(path.join(ADVERTISING_DIR, slug));
    if (!routeExists) orphaned.push(slug);
  }

  if (missing.length === 0 && orphaned.length === 0) {
    console.log(
      `\u2713 Tort profile registry in sync (${routes.length} routes, ${registered.size} registered hrefs)`
    );
    return;
  }

  console.error("\n\u2717 Tort profile registry is out of sync.\n");
  if (missing.length > 0) {
    console.error(
      "Missing from Mass Tort Overview (app/(app)/mass-tort-overview/page.tsx):"
    );
    for (const slug of missing) console.error(`  - /advertising/${slug}`);
    console.error(
      "\nFix by adding an entry to MDL_TORT_NAMES (with hasFullProfile: true)"
    );
    console.error(
      "or PRE_MDL_TORTS in app/(app)/mass-tort-overview/page.tsx, or by adding"
    );
    console.error(
      "the slug to NON_TORT_ROUTES / SUB_TOOL_ALIASES in this script."
    );
  }
  if (orphaned.length > 0) {
    console.error(
      "\nRegistered in overview but the route directory does not exist:"
    );
    for (const slug of orphaned) console.error(`  - /advertising/${slug}`);
  }
  console.error("");
  process.exit(1);
}

main();
