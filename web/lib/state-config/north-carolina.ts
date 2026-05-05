import { northCarolinaCompetitiveData } from "@/lib/data/competitive-landscape/north-carolina";
import type { StateConfig } from "./_types";

export const northCarolinaConfig: StateConfig = {
  slug: "north-carolina",
  stateCode: "NC",
  stateName: "North Carolina",

  metadata: {
    title: "North Carolina State Intelligence | Legal Marketing Intelligence",
    description:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in North Carolina — combining state DOT crash and injury data, demographics, judicial profiles, and market opportunity signals across Charlotte, Raleigh-Durham, Greensboro, Winston-Salem, Asheville.",
  },

  // Source: state DOT annual crash report (2023).
  trafficStats: {
    totalCrashes: 284157,
    totalFatalities: 1686,
    motorcycleFatalities: 202,
    speedRelatedFatalities: 389,
    speedRelatedPct: 23.1,
    alcoholRelatedFatalities: 377,
    alcoholRelatedPct: 22.4,
    unrestrainedFatalities: 504,
    distractedDrivingFatalCrashes: 132,
    urbanFatalities: 0,
    ruralFatalities: 0,
    reportYear: 2023,
    sourceLabel: "NCDMV 2023",
  },

  // Source: BLS Census of Fatal Occupational Injuries — North Carolina 2023.
  workplaceStats: {
    totalEmployment: 4858000,
    qcewCoveredEmployment: 4858000,
    totalWorkplaceFatalities: 177,
    constructionFatalities: 43,
    constructionPctTotal: 24.3,
    transportWarehouseFatalities: 23,
    truckTransportFatalities: 17,
    fallsSlipsTrips: 38,
    transportationIncidents: 62,
    reportYear: 2023,
  },

  // Source: U.S. Census ACS 5-year estimates.
  commuteStats: {
    driveAlone: 81.0,
    nationalAvg: 68.7,
    avgCommuteMinutes: 25.0,
  },

  competitiveData: northCarolinaCompetitiveData,

  // Generic narrative — reads as state-name-parameterized fallbacks via
  // the client component. State-specific narrative will be added as we
  // research deeper per state.

  // No injuryData yet; add when state-specific deep crash data is integrated.
};
