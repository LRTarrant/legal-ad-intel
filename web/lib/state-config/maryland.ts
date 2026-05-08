import { marylandCompetitiveData } from "@/lib/data/competitive-landscape/maryland";
import type { StateConfig } from "./_types";

export const marylandConfig: StateConfig = {
  slug: "maryland",
  stateCode: "MD",
  stateName: "Maryland",

  metadata: {
    title: "Maryland State Intelligence | Legal Marketing Intelligence",
    description:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Maryland — combining state DOT crash data, demographics, judicial profiles, and market opportunity signals across Baltimore, Rockville, Frederick, Annapolis, and Hagerstown. Population ~6.2M.",
  },

  // Placeholder values; to be filled with real FARS/MDOT figures.
  trafficStats: {
    totalCrashes: 0,
    totalFatalities: 578, // FARS 2024 (preliminary)
    motorcycleFatalities: null,
    speedRelatedFatalities: null,
    speedRelatedPct: null,
    alcoholRelatedFatalities: 163, // FARS 2024 (preliminary)
    alcoholRelatedPct: 28.2, // 163 / 578 FARS 2024 (preliminary)
    unrestrainedFatalities: 0,
    distractedDrivingFatalCrashes: 0,
    urbanFatalities: 474, // FARS 2024 (preliminary)
    ruralFatalities: 102, // FARS 2024 (preliminary)
    reportYear: 2024,
    sourceLabel: "FARS 2024 (preliminary)",
  },

  // Placeholder values; to be filled with BLS CFOI figures.
  workplaceStats: {
    totalEmployment: 0,
    qcewCoveredEmployment: 0,
    totalWorkplaceFatalities: 0,
    constructionFatalities: 0,
    constructionPctTotal: 0,
    transportWarehouseFatalities: 0,
    truckTransportFatalities: null,
    fallsSlipsTrips: 0,
    transportationIncidents: 0,
    reportYear: 2023,
  },

  // Placeholder values; to be filled with ACS estimates.
  commuteStats: {
    driveAlone: 0,
    nationalAvg: 68.7,
    avgCommuteMinutes: 0,
  },

  competitiveData: marylandCompetitiveData,

  content: {
    heroSubtitle:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Maryland — combining MDOT crash data, demographics, judicial profiles, and market opportunity signals across Baltimore, Rockville, Frederick, Annapolis, and Hagerstown. Population ~6.2M.",

    legalLandscape:
      "Maryland uses contributory negligence — plaintiffs who bear any fault for their injuries, however slight, are barred from recovering damages. This is one of the strictest plaintiff-side rules in the country and is a defining characteristic of Maryland PI practice. The personal injury statute of limitations is three years from the date of injury (Md. Code, Cts. & Jud. Proc. § 5-101). Maryland is not a no-fault auto insurance state. Maryland imposes a statutory cap on non-economic damages in personal injury cases that adjusts annually.",

    autoAudience:
      "Maryland's road network is anchored by I-95 running northeast–southwest through Baltimore and the DC suburbs, I-83 running north from Baltimore, I-270 running northwest from the Capital Beltway, and I-68 serving western Maryland. The Baltimore–Washington corridor drives the majority of the state's vehicle miles traveled. Maryland's contributory negligence rule means plaintiff firms must screen carefully at intake for comparative fault exposure — any plaintiff fault bars recovery entirely.",

    truckAudience:
      "Maryland is crossed by major interstate routes — I-95, I-83, I-270, I-68, and I-495 (the Capital Beltway) — that carry significant commercial-vehicle traffic. Commercial-vehicle incidents on these corridors often involve out-of-state carriers, which can affect jurisdiction and carrier insurance structure.",

    motorcycleAudience:
      "Maryland requires helmets for all motorcycle operators and passengers. Maryland's contributory negligence rule creates particular exposure in motorcycle cases — any finding of rider fault bars recovery, making careful plaintiff screening critical at intake.",

    constructionAudience:
      "Maryland has an active construction market across the Baltimore metro and the DC-suburb corridor (Montgomery and Prince George's counties). Workers' comp is mandatory, but third-party tort claims against contractors, architects, and property owners are common in multi-party construction PI. Maryland's contributory negligence rule applies in construction PI as well — plaintiff firms must assess comparative fault carefully before accepting cases.",

    ruralUrbanContext:
      "Maryland is heavily urbanized along the I-95 Baltimore–DC corridor, with rural exposure in western Maryland (Garrett, Allegany, Washington counties) and the Eastern Shore. Rural areas have longer EMS response times and more limited trauma center access. PI firms targeting rural western Maryland or the Eastern Shore should consider broadcast and outdoor alongside digital given lower population density.",

    judicialContext:
      "Maryland has major court complexes in its largest population centers: Baltimore City, Baltimore County, Montgomery County (Rockville), Prince George's County (Upper Marlboro), and Anne Arundel County (Annapolis). Venue is determined by plaintiff residency or incident location. Plaintiff firms should evaluate the specific court of venue for each case.",

    marketSaturationTitle: "Baltimore / DC Suburbs vs. Secondary Market Opportunity",
    marketSaturationTip:
      "The Baltimore DMA and the DC-suburb markets (Montgomery, Prince George's counties) have the highest PI advertiser density in Maryland. Frederick, Annapolis, and Hagerstown are materially less saturated. Maryland's contributory negligence rule reduces overall case volume relative to comparative-fault states, which also affects market saturation dynamics.",

    freightCorridorTitle: "I-95 / I-270 Interstate Corridors",
    freightCorridorTip:
      "I-95 runs northeast–southwest through Baltimore and the DC suburbs, carrying substantial commercial-vehicle volume along the Northeast Corridor. I-270 and I-495 serve the suburban ring west and south of Baltimore. Commercial-vehicle cases on these routes may involve out-of-state carriers and multi-state insurance structures.",

    solUrgencyTitle: "3-Year SOL + Contributory Negligence Urgency",
    solUrgencyTip:
      "Maryland's three-year statute of limitations is standard, but the contributory negligence rule creates a different kind of urgency: plaintiff firms must assess comparative fault early. A case that looks viable at intake can be barred entirely if fault investigation reveals any plaintiff negligence. Early evidence preservation and fault analysis are critical before investing in case development.",

    internetAccessTitle: "Western Maryland / Eastern Shore Media Mix",
    internetAccessTip:
      "Western Maryland (Garrett, Allegany, Washington counties) and parts of the Eastern Shore have lower population density than the Baltimore–DC corridor. PI firms targeting these areas should consider a broader media mix including local broadcast radio and regional outdoor alongside digital given lower population density in non-metro counties.",
  },

  features: {
    showWorkplaceSection: false,
  },
};
