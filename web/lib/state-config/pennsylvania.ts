import { pennsylvaniaCompetitiveData } from "@/lib/data/competitive-landscape/pennsylvania";
import type { StateConfig } from "./_types";

export const pennsylvaniaConfig: StateConfig = {
  slug: "pennsylvania",
  stateCode: "PA",
  stateName: "Pennsylvania",

  metadata: {
    title: "Pennsylvania State Intelligence | Legal Marketing Intelligence",
    description:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Pennsylvania — combining state DOT crash and injury data, demographics, judicial profiles, and market opportunity signals across Philadelphia, Pittsburgh, Allentown, Harrisburg, Scranton.",
  },

  // Source: state DOT annual crash report (2024).
  trafficStats: {
    totalCrashes: 110765,
    totalFatalities: 1127,
    motorcycleFatalities: 219,
    speedRelatedFatalities: 263,
    speedRelatedPct: 23.3,
    alcoholRelatedFatalities: 244,
    alcoholRelatedPct: 22.0,
    unrestrainedFatalities: 522,
    distractedDrivingFatalCrashes: 49,
    urbanFatalities: 0,
    ruralFatalities: 0,
    reportYear: 2024,
    sourceLabel: "PennDOT 2024",
  },

  // Source: BLS Census of Fatal Occupational Injuries — Pennsylvania 2023.
  workplaceStats: {
    totalEmployment: 5963000,
    qcewCoveredEmployment: 5963025,
    totalWorkplaceFatalities: 169,
    constructionFatalities: 30,
    constructionPctTotal: 18.0,
    transportWarehouseFatalities: 28,
    truckTransportFatalities: 0,
    fallsSlipsTrips: 43,
    transportationIncidents: 50,
    reportYear: 2023,
  },

  // Source: U.S. Census ACS 5-year estimates.
  commuteStats: {
    driveAlone: 74.0,
    nationalAvg: 68.7,
    avgCommuteMinutes: 26.6,
  },

  competitiveData: pennsylvaniaCompetitiveData,

  // Generic narrative — reads as state-name-parameterized fallbacks via
  // the client component. State-specific narrative will be added as we
  // research deeper per state.

  // No injuryData yet; add when state-specific deep crash data is integrated.
};
