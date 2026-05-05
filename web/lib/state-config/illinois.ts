import { illinoisCompetitiveData } from "@/lib/data/competitive-landscape/illinois";
import type { StateConfig } from "./_types";

export const illinoisConfig: StateConfig = {
  slug: "illinois",
  stateCode: "IL",
  stateName: "Illinois",

  metadata: {
    title: "Illinois State Intelligence | Legal Marketing Intelligence",
    description:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Illinois — combining state DOT crash and injury data, demographics, judicial profiles, and market opportunity signals across Chicago, Rockford, Peoria, Champaign-Urbana, Springfield.",
  },

  // Source: state DOT annual crash report (2024).
  trafficStats: {
    totalCrashes: 303913,
    totalFatalities: 1178,
    motorcycleFatalities: 144,
    speedRelatedFatalities: 0,
    speedRelatedPct: 0,
    alcoholRelatedFatalities: 0,
    alcoholRelatedPct: 0,
    unrestrainedFatalities: 255,
    distractedDrivingFatalCrashes: 0,
    urbanFatalities: 0,
    ruralFatalities: 0,
    reportYear: 2024,
    sourceLabel: "IDOT 2024",
  },

  // Source: BLS Census of Fatal Occupational Injuries — Illinois 2023.
  workplaceStats: {
    totalEmployment: 6120000,
    qcewCoveredEmployment: 5938000,
    totalWorkplaceFatalities: 145,
    constructionFatalities: 30,
    constructionPctTotal: 20.7,
    transportWarehouseFatalities: 40,
    truckTransportFatalities: 0,
    fallsSlipsTrips: 25,
    transportationIncidents: 55,
    reportYear: 2023,
  },

  // Source: U.S. Census ACS 5-year estimates.
  commuteStats: {
    driveAlone: 67.3,
    nationalAvg: 68.7,
    avgCommuteMinutes: 28.5,
  },

  competitiveData: illinoisCompetitiveData,

  // Generic narrative — reads as state-name-parameterized fallbacks via
  // the client component. State-specific narrative will be added as we
  // research deeper per state.

  // No injuryData yet; add when state-specific deep crash data is integrated.
};
