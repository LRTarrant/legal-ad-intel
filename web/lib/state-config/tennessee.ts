import { tennesseeCompetitiveData } from "@/lib/data/competitive-landscape/tennessee";
import {
  TN_COUNTY_INJURY_DATA,
  TN_INJURY_DATA_YEARS,
  TN_INJURY_DATA_LATEST_YEAR,
} from "@/lib/data/tn-injury-stats";
import type { StateConfig } from "./_types";

export const tennesseeConfig: StateConfig = {
  slug: "tennessee",
  stateCode: "TN",
  stateName: "Tennessee",

  metadata: {
    title: "Tennessee State Intelligence | Legal Marketing Intelligence",
    description:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Tennessee — accident data, demographics, judicial profiles, TN Safety crash dashboards, and market opportunity signals.",
  },

  trafficStats: {
    totalCrashes: 212_780,
    totalFatalities: 1_299,
    motorcycleFatalities: 186,
    speedRelatedFatalities: 344,
    speedRelatedPct: 26.5,
    alcoholRelatedFatalities: 345,
    alcoholRelatedPct: 26.6,
    unrestrainedFatalities: 397,
    distractedDrivingFatalCrashes: 54,
    urbanFatalities: 706,
    ruralFatalities: 593,
    reportYear: 2024,
    sourceLabel: "TDOSHS 2024",
  },

  workplaceStats: {
    totalEmployment: 3_064_770,
    qcewCoveredEmployment: 3_082_000,
    totalWorkplaceFatalities: 128,
    constructionFatalities: 24,
    constructionPctTotal: 19,
    transportWarehouseFatalities: 35,
    truckTransportFatalities: 28,
    fallsSlipsTrips: 17,
    transportationIncidents: 55,
    reportYear: 2023,
  },

  commuteStats: {
    driveAlone: 79.8,
    nationalAvg: 68.7,
    avgCommuteMinutes: 26,
  },

  competitiveData: tennesseeCompetitiveData,

  injuryData: {
    rows: TN_COUNTY_INJURY_DATA,
    years: TN_INJURY_DATA_YEARS,
    latestYear: TN_INJURY_DATA_LATEST_YEAR,
    sourceName: "Tennessee Department of Safety & Homeland Security — TITAN",
    sourceUrl: "https://data.tn.gov/",
  },

  crashEmbeds: [
    {
      name: "Fatal & Serious Injury Crashes",
      iframeSrc:
        "https://data.tn.gov/t/Public/views/FatalandSeriousInjuryPublic/FSIC_dashboard?iframeSizedToWindow=true&:embed=y&:showAppBanner=false&:display_count=no&:showVizHome=no&:toolbar=no",
      height: 2000,
      description:
        "Statewide fatal and serious injury crashes by county, route, and time period. Updated continuously by the Tennessee Department of Safety & Homeland Security.",
    },
    {
      name: "Recent Crashes",
      iframeSrc:
        "https://data.tn.gov/t/Public/views/RecentCrashes/RecentCrashes?:showAppBanner=false&:display_count=n&:showVizHome=n&:origin=viz_share_link&:toolbar=no&:embed=yes",
      height: 4500,
      description: "Most recent reported crashes statewide.",
    },
    {
      name: "Traffic Fatality Trends",
      iframeSrc:
        "https://data.tn.gov/t/Public/views/TN_Traffic_Fatality/TTF_dashboard?iframeSizedToWindow=true&:embed=y&:showAppBanner=false&:display_count=no&:showVizHome=no&:toolbar=no",
      height: 3100,
      description: "Historic and trending traffic fatality data.",
    },
  ],
};
