import { newYorkCompetitiveData } from "@/lib/data/competitive-landscape/new-york";
import type { StateConfig } from "./_types";

export const newYorkConfig: StateConfig = {
  slug: "new-york",
  stateCode: "NY",
  stateName: "New York",

  metadata: {
    title: "New York State Intelligence | Legal Marketing Intelligence",
    description:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in New York — combining state DOT crash and injury data, demographics, judicial profiles, and market opportunity signals across New York City, Buffalo, Rochester, Albany, Syracuse.",
  },

  // Source: state DOT annual crash report (2023).
  trafficStats: {
    totalCrashes: 382000,
    totalFatalities: 1104,
    motorcycleFatalities: 120,
    speedRelatedFatalities: 350,
    speedRelatedPct: 32.0,
    alcoholRelatedFatalities: 300,
    alcoholRelatedPct: 27.0,
    unrestrainedFatalities: 250,
    distractedDrivingFatalCrashes: 80,
    urbanFatalities: 800,
    ruralFatalities: 304,
    reportYear: 2023,
    sourceLabel: "ITSMR NY 2023",
  },

  // Source: BLS Census of Fatal Occupational Injuries — New York 2023.
  workplaceStats: {
    totalEmployment: 9400000,
    qcewCoveredEmployment: 9369000,
    totalWorkplaceFatalities: 246,
    constructionFatalities: 60,
    constructionPctTotal: 24.0,
    transportWarehouseFatalities: 27,
    truckTransportFatalities: 11,
    fallsSlipsTrips: 54,
    transportationIncidents: 62,
    reportYear: 2023,
  },

  // Source: U.S. Census ACS 5-year estimates.
  commuteStats: {
    driveAlone: 55.0,
    nationalAvg: 68.7,
    avgCommuteMinutes: 33.0,
  },

  competitiveData: newYorkCompetitiveData,

  // Generic narrative — reads as state-name-parameterized fallbacks via
  // the client component. State-specific narrative will be added as we
  // research deeper per state.

  // No injuryData yet; add when state-specific deep crash data is integrated.
};
