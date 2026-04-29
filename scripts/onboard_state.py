#!/usr/bin/env python3
"""Scaffold a new state for the state-intelligence section.

Usage:
    python scripts/onboard_state.py georgia \
        --abbr GA \
        --display-name "Georgia" \
        --has-injury-data

This creates the necessary files and registers the state in the sidebar,
AI search allowlist, and enrichment script. Existing files are never
overwritten — the script errors out if the state already has files in place.
"""

import argparse
import re
import sys
import textwrap
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
WEB_ROOT = REPO_ROOT / "web"


def slugify(name: str) -> str:
    return name.lower().replace(" ", "-")


def abort(msg: str) -> None:
    print(f"ERROR: {msg}", file=sys.stderr)
    sys.exit(1)


def safe_write(path: Path, content: str) -> None:
    if path.exists():
        abort(f"{path} already exists — refusing to overwrite")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content)
    print(f"  Created {path.relative_to(REPO_ROOT)}")


# ---------------------------------------------------------------------------
# Templates
# ---------------------------------------------------------------------------

def page_tsx(slug: str, display_name: str, abbr: str, has_injury: bool) -> str:
    client_import = f'{slug.replace("-", "_")}_client'
    client_comp = "".join(w.capitalize() for w in slug.split("-")) + "Client"
    pascal = "".join(w.capitalize() for w in slug.split("-"))
    return textwrap.dedent(f'''\
        import nextDynamic from "next/dynamic";
        import {{ getSupabase }} from "@/lib/supabase";
        import type {{ {pascal}PageData }} from "./{slug}-client";
        import {{ getJudicialProfiles, type JudicialProfileRow }} from "@/lib/queries/judicial";

        const {client_comp} = nextDynamic(() => import("./{slug}-client").then((m) => m.{client_comp}));

        export const dynamic = "force-dynamic";

        export function generateMetadata() {{
          return {{
            title: "{display_name} State Intelligence | Legal Marketing Intelligence",
            description:
              "Cross-signal intelligence for plaintiff firm advertising and case acquisition in {display_name}.",
          }};
        }}

        /* ------------------------------------------------------------------ */
        /*  Types for RPC results                                              */
        /* ------------------------------------------------------------------ */

        interface AccidentSummaryRow {{
          county: string;
          total_population: number | null;
          fatal_crashes: number;
          total_deaths: number;
          truck_deaths: number;
          moto_deaths: number;
          drunk_driver_crashes: number;
          deaths_per_100k: number | null;
          rural_pct: number | null;
          judicial_profile: string | null;
        }}

        interface RuralUrbanRow {{
          category: string;
          fatal_crashes: number;
          total_deaths: number;
          total_population: number | null;
          deaths_per_100k: number | null;
          avg_deaths_per_100k: number | null;
          avg_median_income: number | null;
          avg_poverty_pct: number | null;
          avg_internet_pct: number | null;
          avg_uninsured_pct: number | null;
        }}

        interface StormSummaryRow {{
          event_type: string;
          event_count: number;
          total_deaths: number;
          total_injuries: number;
          total_property_damage: string | null;
        }}

        interface BoatingSummaryRow {{
          county: string;
          accident_count: number;
          total_deaths: number;
          total_injuries: number;
          top_causes: string | null;
        }}

        interface PIViabilityRow {{
          state: string;
          negligence_rule: string;
          statute_of_limitations: string;
          composite_score: number;
          avg_jury_verdict: number | string | null;
          non_economic_cap: string | null;
          punitive_cap: string | null;
          negligence_score: number | null;
          non_economic_score: number | null;
          punitive_score: number | null;
          med_mal_score: number | null;
          sol_score: number | null;
          verdict_score: number | null;
        }}

        interface CensusDemographicsRow {{
          fips_full: string;
          state_abbr: string;
          county_name: string;
          total_population: number;
          median_age: number | null;
          pct_white: number | null;
          pct_black: number | null;
          pct_hispanic: number | null;
          median_household_income: number | null;
          per_capita_income: number | null;
          pct_poverty: number | null;
          pct_uninsured: number | null;
          pct_employed: number | null;
          pct_with_internet: number | null;
          pct_disability: number | null;
          pct_veterans: number | null;
        }}

        interface MSADemographicsRow {{
          cbsa_code: string;
          cbsa_title: string;
          total_population: number;
          median_household_income: number | null;
          pct_poverty: number | null;
          pct_uninsured: number | null;
          pct_employed: number | null;
        }}

        /* ------------------------------------------------------------------ */
        /*  Data-fetching helpers                                               */
        /* ------------------------------------------------------------------ */

        async function fetchAccidentSummary(): Promise<AccidentSummaryRow[]> {{
          const supabase = getSupabase();
          const sb = supabase as unknown as {{
            rpc: (fn: string, params: Record<string, string>) => Promise<{{ data: unknown; error: unknown }}>;
          }};
          const {{ data, error }} = await sb.rpc("get_state_accident_summary", {{
            p_state: "{abbr}",
          }});
          if (error) throw error;
          return (data ?? []) as unknown as AccidentSummaryRow[];
        }}

        async function fetchRuralUrbanComparison(): Promise<RuralUrbanRow[]> {{
          const supabase = getSupabase();
          const sb = supabase as unknown as {{
            rpc: (fn: string, params: Record<string, string>) => Promise<{{ data: unknown; error: unknown }}>;
          }};
          const {{ data, error }} = await sb.rpc(
            "get_state_rural_urban_comparison",
            {{ p_state: "{abbr}" }}
          );
          if (error) throw error;
          return (data ?? []) as unknown as RuralUrbanRow[];
        }}

        async function fetchStormSummary(): Promise<StormSummaryRow[]> {{
          const supabase = getSupabase();
          const sb = supabase as unknown as {{
            rpc: (fn: string, params: Record<string, string>) => Promise<{{ data: unknown; error: unknown }}>;
          }};
          const {{ data, error }} = await sb.rpc("get_state_storm_summary", {{
            p_state: "{display_name}",
          }});
          if (error) throw error;
          return (data ?? []) as unknown as StormSummaryRow[];
        }}

        async function fetchBoatingSummary(): Promise<BoatingSummaryRow[]> {{
          const supabase = getSupabase();
          const sb = supabase as unknown as {{
            rpc: (fn: string, params: Record<string, string>) => Promise<{{ data: unknown; error: unknown }}>;
          }};
          const {{ data, error }} = await sb.rpc("get_state_boating_summary", {{
            p_state: "{abbr}",
          }});
          if (error) throw error;
          return (data ?? []) as unknown as BoatingSummaryRow[];
        }}

        async function fetchPIViability(): Promise<PIViabilityRow[]> {{
          const supabase = getSupabase();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const {{ data, error }} = await (supabase as any)
            .from("pi_viability_scores")
            .select("*")
            .eq("state", "{abbr}");
          if (error) throw error;
          return (data ?? []) as unknown as PIViabilityRow[];
        }}

        async function fetchCensusDemographics(): Promise<CensusDemographicsRow[]> {{
          const supabase = getSupabase();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const {{ data, error }} = await (supabase as any)
            .from("census_demographics")
            .select("*")
            .eq("state_abbr", "{abbr}")
            .order("total_population", {{ ascending: false }});
          if (error) throw error;
          return (data ?? []) as unknown as CensusDemographicsRow[];
        }}

        async function fetchMSADemographics(): Promise<MSADemographicsRow[]> {{
          const supabase = getSupabase();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const {{ data, error }} = await (supabase as any)
            .from("msa_demographics")
            .select("*")
            .like("cbsa_title", "%, {abbr}%")
            .order("total_population", {{ ascending: false }});
          if (error) throw error;
          return (data ?? []) as unknown as MSADemographicsRow[];
        }}

        async function fetchStormCount(): Promise<number> {{
          const supabase = getSupabase();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const {{ count, error }} = await (supabase as any)
            .from("storm_events")
            .select("*", {{ count: "exact", head: true }})
            .eq("state", "{display_name}");
          if (error) throw error;
          return count ?? 0;
        }}

        /* ------------------------------------------------------------------ */
        /*  Page Component                                                      */
        /* ------------------------------------------------------------------ */

        export default async function {pascal}StatePage() {{
          let accidentSummary: AccidentSummaryRow[] = [];
          let ruralUrban: RuralUrbanRow[] = [];
          let stormSummary: StormSummaryRow[] = [];
          let boatingSummary: BoatingSummaryRow[] = [];
          let piViability: PIViabilityRow[] = [];
          let censusDemographics: CensusDemographicsRow[] = [];
          let msaDemographics: MSADemographicsRow[] = [];
          let judicialRows: JudicialProfileRow[] = [];
          let stormCount = 0;

          const results = await Promise.allSettled([
            fetchAccidentSummary(),
            fetchRuralUrbanComparison(),
            fetchStormSummary(),
            fetchBoatingSummary(),
            fetchPIViability(),
            fetchCensusDemographics(),
            fetchMSADemographics(),
            getJudicialProfiles("{abbr}"),
            fetchStormCount(),
          ]);

          if (results[0].status === "fulfilled") accidentSummary = results[0].value;
          else console.error("[{display_name}] fetchAccidentSummary failed:", results[0].reason);

          if (results[1].status === "fulfilled") ruralUrban = results[1].value;
          else console.error("[{display_name}] fetchRuralUrbanComparison failed:", results[1].reason);

          if (results[2].status === "fulfilled") stormSummary = results[2].value;
          else console.error("[{display_name}] fetchStormSummary failed:", results[2].reason);

          if (results[3].status === "fulfilled") boatingSummary = results[3].value;
          else console.error("[{display_name}] fetchBoatingSummary failed:", results[3].reason);

          if (results[4].status === "fulfilled") piViability = results[4].value;
          else console.error("[{display_name}] fetchPIViability failed:", results[4].reason);

          if (results[5].status === "fulfilled") censusDemographics = results[5].value;
          else console.error("[{display_name}] fetchCensusDemographics failed:", results[5].reason);

          if (results[6].status === "fulfilled") msaDemographics = results[6].value;
          else console.error("[{display_name}] fetchMSADemographics failed:", results[6].reason);

          if (results[7].status === "fulfilled") judicialRows = results[7].value;
          else console.error("[{display_name}] fetchJudicialProfiles failed:", results[7].reason);

          if (results[8].status === "fulfilled") stormCount = results[8].value;
          else console.error("[{display_name}] fetchStormCount failed:", results[8].reason);

          const pageData: {pascal}PageData = {{
            accidentSummary,
            ruralUrban,
            stormSummary,
            boatingSummary,
            piViability: piViability[0] ?? null,
            censusDemographics,
            msaDemographics,
            judicialProfiles: judicialRows,
            stormCount,
          }};

          return <{client_comp} data={{pageData}} />;
        }}
    ''')


def client_tsx(slug: str, display_name: str, abbr: str, has_injury: bool) -> str:
    pascal = "".join(w.capitalize() for w in slug.split("-"))
    injury_import = ""
    injury_component = ""
    if has_injury:
        abbr_lower = abbr.lower()
        injury_import = textwrap.dedent(f'''\
            import {{ StateInjuryTable }} from "@/components/state-intelligence/StateInjuryTable";
            import {{
              {abbr}_COUNTY_INJURY_DATA,
              {abbr}_INJURY_DATA_YEARS,
              {abbr}_INJURY_DATA_LATEST_YEAR,
            }} from "@/lib/data/{abbr_lower}-injury-stats";
        ''')
        injury_component = textwrap.dedent(f'''\

              {{/* County-Level Injury Rankings */}}
              <StateInjuryTable
                stateName="{display_name}"
                data={{{abbr}_COUNTY_INJURY_DATA}}
                years={{{abbr}_INJURY_DATA_YEARS}}
                latestCompleteYear={{{abbr}_INJURY_DATA_LATEST_YEAR}}
                sourceLabel="{display_name} Crash Statistics PDF"
              />
        ''')

    return textwrap.dedent(f'''\
        "use client";

        import {{ useState, useMemo, useCallback, useEffect }} from "react";
        import Link from "next/link";
        import {{
          ArrowLeft,
          AlertTriangle,
          Scale,
          Car,
          MapPin,
          ChevronUp,
          ChevronDown,
          Search,
          BarChart3,
          Database,
        }} from "lucide-react";
        import type {{ JudicialProfileRow }} from "@/lib/queries/judicial";
        import {{ AskAIPanel }} from "../../components/ask-ai-panel";
        import {{ trackStateViewed }} from "@/lib/analytics";
        import {{
          PIAdvertisingSection,
          buildPIAdSummary,
          type PIAdvertisingData,
        }} from "../../components/pi-advertising-section";
        import {{ CompetitiveLandscapeTable }} from "../../components/competitive-landscape-table";
        import {{ StateAdvertisingSection }} from "../../components/state-advertising-section";
        import {{ StateCrashEmbed }} from "@/components/state-intelligence/StateCrashEmbed";
        import {{ {slug.replace("-", "")}CompetitiveData }} from "@/lib/data/competitive-landscape/{slug}";
        {injury_import}
        /* ------------------------------------------------------------------ */
        /*  Types                                                              */
        /* ------------------------------------------------------------------ */

        // TODO: Fill in the same interface types as Tennessee's page
        // See tennessee-client.tsx for the full type definitions

        interface AccidentSummaryRow {{
          county: string;
          total_population: number | null;
          fatal_crashes: number;
          total_deaths: number;
          truck_deaths: number;
          moto_deaths: number;
          drunk_driver_crashes: number;
          deaths_per_100k: number | null;
          rural_pct: number | null;
          judicial_profile: string | null;
        }}

        interface RuralUrbanRow {{
          category: string;
          fatal_crashes: number;
          total_deaths: number;
          avg_median_income: number | null;
          avg_poverty_pct: number | null;
          avg_internet_pct: number | null;
          avg_uninsured_pct: number | null;
        }}

        interface StormSummaryRow {{
          event_type: string;
          event_count: number;
          total_deaths: number;
          total_injuries: number;
          total_property_damage: string | null;
        }}

        interface BoatingSummaryRow {{
          county: string;
          accident_count: number;
          total_deaths: number;
          total_injuries: number;
          top_causes: string | null;
        }}

        interface PIViabilityRow {{
          state: string;
          negligence_rule: string;
          statute_of_limitations: string;
          composite_score: number;
          avg_jury_verdict: number | string | null;
          non_economic_cap: string | null;
          punitive_cap: string | null;
          negligence_score: number | null;
          non_economic_score: number | null;
          punitive_score: number | null;
          med_mal_score: number | null;
          sol_score: number | null;
          verdict_score: number | null;
        }}

        interface CensusDemographicsRow {{
          fips_full: string;
          state_abbr: string;
          county_name: string;
          total_population: number;
          median_age: number | null;
          pct_white: number | null;
          pct_black: number | null;
          pct_hispanic: number | null;
          median_household_income: number | null;
          per_capita_income: number | null;
          pct_poverty: number | null;
          pct_uninsured: number | null;
          pct_employed: number | null;
          pct_with_internet: number | null;
          pct_disability: number | null;
          pct_veterans: number | null;
        }}

        interface MSADemographicsRow {{
          cbsa_code: string;
          cbsa_title: string;
          total_population: number;
          median_household_income: number | null;
          pct_poverty: number | null;
          pct_uninsured: number | null;
          pct_employed: number | null;
        }}

        export interface {pascal}PageData {{
          accidentSummary: AccidentSummaryRow[];
          ruralUrban: RuralUrbanRow[];
          stormSummary: StormSummaryRow[];
          boatingSummary: BoatingSummaryRow[];
          piViability: PIViabilityRow | null;
          censusDemographics: CensusDemographicsRow[];
          msaDemographics: MSADemographicsRow[];
          judicialProfiles: JudicialProfileRow[];
          stormCount: number;
        }}

        /* ------------------------------------------------------------------ */
        /*  Component                                                          */
        /* ------------------------------------------------------------------ */

        export function {pascal}Client({{ data }}: {{ data: {pascal}PageData }}) {{
          const [piAdData, setPiAdData] = useState<PIAdvertisingData | null>(null);
          const handlePIAdDataLoaded = useCallback((d: PIAdvertisingData) => setPiAdData(d), []);

          useEffect(() => {{
            trackStateViewed({{ state_code: "{abbr}", state_name: "{display_name}" }});
          }}, []);

          return (
            <div className="space-y-8">
              {{/* State Header */}}
              <div>
                <Link
                  href="/overview"
                  className="text-sm text-slate-gray hover:text-midnight-navy"
                >
                  <span className="flex items-center gap-1">
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Overview
                  </span>
                </Link>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <h1 className="font-heading text-3xl font-bold text-midnight-navy">
                    {display_name}
                  </h1>
                </div>
                <p className="mt-1 text-lg text-slate-gray">
                  State Intelligence Report
                </p>
              </div>
        {injury_component}
              {{/* TODO: Add Tableau crash dashboard embeds */}}
              {{/* <StateCrashEmbed stateName="{display_name}" embeds={{[/* paste iframe URLs here */]}} /> */}}

              {{/* Advertising sections */}}
              <PIAdvertisingSection stateAbbr="{abbr}" onDataLoaded={{handlePIAdDataLoaded}} />
              <CompetitiveLandscapeTable data={{{slug.replace("-", "")}CompetitiveData}} />
              <StateAdvertisingSection stateAbbr="{abbr}" stateName="{display_name}" />

              {{/* Ask AI */}}
              <AskAIPanel
                pageContext={{{{
                  pageName: "{display_name} State Intelligence",
                  pageDescription:
                    "State-level intelligence for plaintiff firm advertising and case acquisition in {display_name}.",
                  dataSummary: `State: {display_name}.${{piAdData ? ` ${{buildPIAdSummary(piAdData)}}` : ""}}`,
                }}}}
              />
            </div>
          );
        }}
    ''')


def competitive_landscape_stub(slug: str, display_name: str) -> str:
    var_name = slug.replace("-", "") + "CompetitiveData"
    return textwrap.dedent(f'''\
        import type {{ CompetitiveLandscapeData }} from "./types";

        // TODO: Seed plaintiff firms — 5 per major DMA
        export const {var_name}: CompetitiveLandscapeData = {{
          "state": "{display_name}",
          "markets": [],
          "practiceAreas": ["PI / General"],
          "data": {{}},
          "dataMonth": "",
          "totalAdvertisers": 0
        }};
    ''')


def injury_stats_stub(abbr: str) -> str:
    upper = abbr.upper()
    return textwrap.dedent(f'''\
        export interface {upper.capitalize()}CountyInjuryRow {{
          year: number;
          county: string;
          fatal: number;
          seriousInjury: number;
          minorInjury: number;
          possibleInjury: number;
          noInjury: number;
          unknown: number;
          total: number;
        }}

        // TODO: Run scripts/parse_state_injury_pdf.py to populate this file
        export const {upper}_INJURY_DATA_LATEST_YEAR = 2024;
        export const {upper}_INJURY_DATA_YEARS: number[] = [];
        export const {upper}_COUNTY_INJURY_DATA: {upper.capitalize()}CountyInjuryRow[] = [];
    ''')


# ---------------------------------------------------------------------------
# Registration helpers
# ---------------------------------------------------------------------------

def add_to_state_files(slug: str, abbr: str) -> None:
    """Add entry to STATE_FILES dict in apply_enrichment_to_ts.py."""
    path = REPO_ROOT / "scripts" / "apply_enrichment_to_ts.py"
    if not path.exists():
        print(f"  WARNING: {path} not found — skipping STATE_FILES registration")
        return

    content = path.read_text()
    marker = f'    "{slug}":'
    if marker in content:
        print(f"  STATE_FILES already has {slug} — skipping")
        return

    # Insert before the closing brace of STATE_FILES
    # Find the last entry line before the }
    pattern = r'(STATE_FILES\s*=\s*\{[^}]*?)(\n\})'
    match = re.search(pattern, content, re.DOTALL)
    if match:
        new_entry = f'\n    "{slug}": "{slug}.ts",'
        content = content[:match.end(1)] + new_entry + content[match.start(2):]
        path.write_text(content)
        print(f"  Added {slug} to STATE_FILES in apply_enrichment_to_ts.py")
    else:
        print(f"  WARNING: Could not find STATE_FILES dict — skipping")


def add_to_sidebar(slug: str, display_name: str) -> None:
    """Add state to sidebar navigation."""
    path = WEB_ROOT / "app" / "(app)" / "sidebar.tsx"
    if not path.exists():
        print(f"  WARNING: {path} not found — skipping sidebar registration")
        return

    content = path.read_text()
    href = f"/state-intelligence/{slug}"
    if href in content:
        print(f"  Sidebar already has {slug} — skipping")
        return

    # Insert after the Tennessee entry (alphabetically sorted)
    tn_line = '{renderNavLink({ label: "Tennessee", href: "/state-intelligence/tennessee", Icon: MapPin })}'
    new_line = f'              {{renderNavLink({{ label: "{display_name}", href: "/state-intelligence/{slug}", Icon: MapPin }})}}'

    # Find all state lines and insert in alphabetical order
    # The states are listed alphabetically, find where to insert
    lines = content.split("\n")
    insert_idx = None
    for i, line in enumerate(lines):
        if '/state-intelligence/' in line and 'renderNavLink' in line:
            # Extract the label from this line
            m = re.search(r'label:\s*"([^"]+)"', line)
            if m:
                existing_label = m.group(1)
                if display_name < existing_label:
                    insert_idx = i
                    break
                insert_idx = i + 1  # insert after this one

    if insert_idx is not None:
        lines.insert(insert_idx, new_line)
        path.write_text("\n".join(lines))
        print(f"  Added {display_name} to sidebar navigation")
    else:
        print(f"  WARNING: Could not find insertion point in sidebar — skipping")


def add_to_ai_search(slug: str, abbr: str) -> None:
    """Add state to AI search route allowlist."""
    path = WEB_ROOT / "app" / "api" / "campaign-builder" / "ai-search" / "route.ts"
    if not path.exists():
        print(f"  WARNING: {path} not found — skipping AI search registration")
        return

    content = path.read_text()

    # Add to VALID_STATE_SLUGS
    if f'"{slug}"' not in content or f'"{slug}"' not in content.split("VALID_STATE_SLUGS")[1].split("]")[0]:
        # Find the closing bracket of VALID_STATE_SLUGS
        pattern = r'(const VALID_STATE_SLUGS\s*=\s*new Set\(\[\s*(?:[^\]]*?))(,?\s*\]\))'
        match = re.search(pattern, content, re.DOTALL)
        if match:
            content = content[:match.end(1)] + f',\n  "{slug}"' + content[match.start(2):]
            print(f"  Added {slug} to VALID_STATE_SLUGS")

    # Add to STATE_ABBR_TO_NAME
    abbr_lower = abbr.lower()
    if f'{abbr_lower}:' not in content:
        pattern = r'(const STATE_ABBR_TO_NAME[^}]*?)(,?\s*\};)'
        match = re.search(pattern, content, re.DOTALL)
        if match:
            content = content[:match.end(1)] + f',\n  {abbr_lower}: "{slug}"' + content[match.start(2):]
            print(f"  Added {abbr_lower} -> {slug} to STATE_ABBR_TO_NAME")

    path.write_text(content)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="Scaffold a new state for state-intelligence")
    parser.add_argument("slug", help="URL slug (e.g. 'georgia')")
    parser.add_argument("--abbr", required=True, help="Two-letter state abbreviation (e.g. 'GA')")
    parser.add_argument("--display-name", required=True, help="Display name (e.g. 'Georgia')")
    parser.add_argument("--has-injury-data", action="store_true", help="Scaffold injury data files")
    args = parser.parse_args()

    slug = slugify(args.slug)
    abbr = args.abbr.upper()
    display_name = args.display_name

    print(f"\nScaffolding {display_name} ({abbr}) as '{slug}'...\n")

    # 1. State page directory
    state_dir = WEB_ROOT / "app" / "(app)" / "state-intelligence" / slug
    safe_write(state_dir / "page.tsx", page_tsx(slug, display_name, abbr, args.has_injury_data))
    safe_write(state_dir / f"{slug}-client.tsx", client_tsx(slug, display_name, abbr, args.has_injury_data))

    # 2. Competitive landscape stub
    safe_write(
        WEB_ROOT / "lib" / "data" / "competitive-landscape" / f"{slug}.ts",
        competitive_landscape_stub(slug, display_name),
    )

    # 3. Injury stats stub (if applicable)
    if args.has_injury_data:
        safe_write(
            WEB_ROOT / "lib" / "data" / f"{abbr.lower()}-injury-stats.ts",
            injury_stats_stub(abbr),
        )

    # 4. Register in STATE_FILES
    add_to_state_files(slug, abbr)

    # 5. Register in sidebar
    add_to_sidebar(slug, display_name)

    # 6. Register in AI search
    add_to_ai_search(slug, abbr)

    # 7. Print checklist
    print(f"""
{'='*60}
SCAFFOLDING COMPLETE for {display_name} ({abbr})
{'='*60}

Remaining manual steps:
  1. Seed plaintiff firms in:
     web/lib/data/competitive-landscape/{slug}.ts
     (5 firms per major DMA)

  2. Find Tableau (or similar) iframe URLs and add them to:
     web/app/(app)/state-intelligence/{slug}/{slug}-client.tsx
     (Look for the StateCrashEmbed TODO comment)
""")

    if args.has_injury_data:
        print(f"""\
  3. If injury PDF exists:
     a. Create state config: scripts/state_configs/{slug}.json
     b. Run parser:
        python scripts/parse_state_injury_pdf.py \\
          --pdf /path/to/{slug}_injuries.pdf \\
          --state-config scripts/state_configs/{slug}.json \\
          --out web/lib/data/{abbr.lower()}-injury-stats.ts
""")

    print(f"""\
  4. Open PR; after merge, trigger ingestion workflows:
     - Ad Intel Daily
     - Google Ads Daily
     - TikTok Ads Daily
     - SERP Intel Daily
""")


if __name__ == "__main__":
    main()
