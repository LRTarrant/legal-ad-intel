"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { JudicialProfileRow } from "@/lib/queries/judicial";
import { AskAIPanel } from "../../components/ask-ai-panel";
import { trackStateViewed } from "@/lib/analytics";
import {
  PIAdvertisingSection,
  buildPIAdSummary,
  type PIAdvertisingData,
} from "../../components/pi-advertising-section";
import { CompetitiveLandscapeTable } from "../../components/competitive-landscape-table";
import { StateAdvertisingSection } from "../../components/state-advertising-section";
import { StateCrashLinkCard } from "@/components/state-intelligence/StateCrashLinkCard";
import { georgiaCompetitiveData } from "@/lib/data/competitive-landscape/georgia";

/* ------------------------------------------------------------------ */
/*  GDOT Crash Data Resources (Path B — iframe embed blocked)          */
/* ------------------------------------------------------------------ */

const GA_CRASH_LINKS = [
  {
    label: "GDOT Crash Data Dashboard",
    url: "https://www.dot.ga.gov/GDOT/Pages/CrashReporting.aspx",
    description:
      "Numetric-powered interactive dashboard with 5-year rolling crash data by county, city, region, and crash type. Maintained by the Georgia Department of Transportation.",
  },
  {
    label: "GOHS FY2023 Annual Report",
    url: "https://www.nhtsa.gov/sites/nhtsa.gov/files/2024-05/GA%20FY23%20Annual%20Report-tag.pdf",
    description:
      "Governor's Office of Highway Safety annual report with county-level fatality breakdowns, pedestrian, alcohol, speed, and motorcyclist fatality data.",
  },
  {
    label: "GA Traffic Safety Facts",
    url: "https://www.gahighwaysafety.org/wp-content/uploads/2023/12/2021-Rural-and-Urban-Comparison-Driving-Georgia-Traffic-Safety-Facts.pdf",
    description:
      "Rural vs. urban crash comparison with county appendices from the Georgia Highway Safety Office.",
  },
];

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AccidentSummaryRow {
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
}

interface RuralUrbanRow {
  category: string;
  fatal_crashes: number;
  total_deaths: number;
  avg_median_income: number | null;
  avg_poverty_pct: number | null;
  avg_internet_pct: number | null;
  avg_uninsured_pct: number | null;
}

interface StormSummaryRow {
  event_type: string;
  event_count: number;
  total_deaths: number;
  total_injuries: number;
  total_property_damage: string | null;
}

interface BoatingSummaryRow {
  county: string;
  accident_count: number;
  total_deaths: number;
  total_injuries: number;
  top_causes: string | null;
}

interface PIViabilityRow {
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
}

interface CensusDemographicsRow {
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
}

interface MSADemographicsRow {
  cbsa_code: string;
  cbsa_title: string;
  total_population: number;
  median_household_income: number | null;
  pct_poverty: number | null;
  pct_uninsured: number | null;
  pct_employed: number | null;
}

export interface GeorgiaPageData {
  accidentSummary: AccidentSummaryRow[];
  ruralUrban: RuralUrbanRow[];
  stormSummary: StormSummaryRow[];
  boatingSummary: BoatingSummaryRow[];
  piViability: PIViabilityRow | null;
  censusDemographics: CensusDemographicsRow[];
  msaDemographics: MSADemographicsRow[];
  judicialProfiles: JudicialProfileRow[];
  stormCount: number;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function GeorgiaClient({ data }: { data: GeorgiaPageData }) {
  const [piAdData, setPiAdData] = useState<PIAdvertisingData | null>(null);
  const handlePIAdDataLoaded = useCallback((d: PIAdvertisingData) => setPiAdData(d), []);

  useEffect(() => {
    trackStateViewed({ state_code: "GA", state_name: "Georgia" });
  }, []);

  return (
    <div className="space-y-8">
      {/* State Header */}
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
            Georgia
          </h1>
        </div>
        <p className="mt-1 text-lg text-slate-gray">
          State Intelligence Report
        </p>
      </div>

      {/* Crash Intelligence — external link card (GDOT blocks iframe embed) */}
      <StateCrashLinkCard
        stateName="Georgia"
        body="Georgia's crash data is published by GDOT on a Numetric dashboard that does not support third-party embedding. Use the links below to access the interactive dashboard and supplemental reports directly."
        links={GA_CRASH_LINKS}
      />

      {/* Advertising sections */}
      <PIAdvertisingSection stateAbbr="GA" onDataLoaded={handlePIAdDataLoaded} />
      <CompetitiveLandscapeTable data={georgiaCompetitiveData} />
      <StateAdvertisingSection stateAbbr="GA" stateName="Georgia" />

      {/* Ask AI */}
      <AskAIPanel
        pageContext={{
          pageName: "Georgia State Intelligence",
          pageDescription:
            "State-level intelligence for plaintiff firm advertising and case acquisition in Georgia.",
          dataSummary: `State: Georgia.${piAdData ? ` ${buildPIAdSummary(piAdData)}` : ""}`,
        }}
      />
    </div>
  );
}
