import { ohioCompetitiveData } from "@/lib/data/competitive-landscape/ohio";
import type { StateConfig } from "./_types";

export const ohioConfig: StateConfig = {
  slug: "ohio",
  stateCode: "OH",
  stateName: "Ohio",

  metadata: {
    title: "Ohio State Intelligence | Legal Marketing Intelligence",
    description:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Ohio — combining state DOT crash and injury data, demographics, judicial profiles, and market opportunity signals across Cleveland, Columbus, Cincinnati, Toledo, Akron.",
  },

  // Traffic totals, motorcycle, urban/rural, speed: OSHP 2024.
  // Alcohol-impaired fatalities: NHTSA FARS 2023 (driver BAC >= 0.08, 455/1242).
  //   OSHP "OVI-related" (589) uses a different denominator and is not comparable
  //   to the BAC >= 0.08 figures used by other states in this system.
  trafficStats: {
    totalCrashes: 252623,
    totalFatalities: 1156,
    motorcycleFatalities: 220,
    speedRelatedFatalities: null, // not broken out in OSHP 2024 summary tables
    speedRelatedPct: null,
    alcoholRelatedFatalities: 455, // NHTSA FARS 2023 — driver BAC >= 0.08
    alcoholRelatedPct: 36.6,       // 455 / 1242 FARS total; comparable to other states
    unrestrainedFatalities: 0,
    distractedDrivingFatalCrashes: 0,
    urbanFatalities: 588,
    ruralFatalities: 568,
    reportYear: 2024,
    sourceLabel: "OSHP 2024",
  },

  // Source: BLS Census of Fatal Occupational Injuries — Ohio 2023.
  workplaceStats: {
    totalEmployment: 5397000,
    qcewCoveredEmployment: 5397409,
    totalWorkplaceFatalities: 164,
    constructionFatalities: 32,
    constructionPctTotal: 19.512,
    transportWarehouseFatalities: 19,
    truckTransportFatalities: null, // not broken out in BLS CFOI 2023 OH state tables
    fallsSlipsTrips: 28,
    transportationIncidents: 51,
    reportYear: 2023,
  },

  // Source: U.S. Census ACS 5-year estimates.
  commuteStats: {
    driveAlone: 75.0,
    nationalAvg: 68.7,
    avgCommuteMinutes: 25.0,
  },

  competitiveData: ohioCompetitiveData,

  // Generic narrative — reads as state-name-parameterized fallbacks via
  // the client component. State-specific narrative will be added as we
  // research deeper per state.

  // No injuryData yet; add when state-specific deep crash data is integrated.
};
