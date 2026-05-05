import { michiganCompetitiveData } from "@/lib/data/competitive-landscape/michigan";
import type { StateConfig } from "./_types";

export const michiganConfig: StateConfig = {
  slug: "michigan",
  stateCode: "MI",
  stateName: "Michigan",

  metadata: {
    title: "Michigan State Intelligence | Legal Marketing Intelligence",
    description:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Michigan — combining state DOT crash and injury data, demographics, judicial profiles, and market opportunity signals across Detroit, Grand Rapids, Lansing, Flint, Ann Arbor.",
  },

  // Source: state DOT annual crash report (2023).
  trafficStats: {
    totalCrashes: 287953,
    totalFatalities: 1095,
    motorcycleFatalities: 165,
    speedRelatedFatalities: 0,
    speedRelatedPct: 0,
    alcoholRelatedFatalities: 297,
    alcoholRelatedPct: 27.1,
    unrestrainedFatalities: 0,
    distractedDrivingFatalCrashes: 56,
    urbanFatalities: 0,
    ruralFatalities: 0,
    reportYear: 2023,
    sourceLabel: "MSP CJIC 2023",
  },

  // Source: BLS Census of Fatal Occupational Injuries — Michigan 2023.
  workplaceStats: {
    totalEmployment: 4850000,
    qcewCoveredEmployment: 4408000,
    totalWorkplaceFatalities: 166,
    constructionFatalities: 39,
    constructionPctTotal: 23.5,
    transportWarehouseFatalities: 13,
    truckTransportFatalities: 0,
    fallsSlipsTrips: 22,
    transportationIncidents: 55,
    reportYear: 2023,
  },

  // Source: U.S. Census ACS 5-year estimates.
  commuteStats: {
    driveAlone: 75.6,
    nationalAvg: 68.7,
    avgCommuteMinutes: 24.0,
  },

  competitiveData: michiganCompetitiveData,

  // Generic narrative — reads as state-name-parameterized fallbacks via
  // the client component. State-specific narrative will be added as we
  // research deeper per state.

  // No injuryData yet; add when state-specific deep crash data is integrated.
};
