import { kentuckyCompetitiveData } from "@/lib/data/competitive-landscape/kentucky";
import type { StateConfig } from "./_types";

export const kentuckyConfig: StateConfig = {
  slug: "kentucky",
  stateCode: "KY",
  stateName: "Kentucky",

  metadata: {
    title: "Kentucky State Intelligence | Legal Marketing Intelligence",
    description:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Kentucky — combining state DOT crash data, demographics, judicial profiles, and market opportunity signals across Louisville, Lexington, Bowling Green, Owensboro, and Covington. Population ~4.5M.",
  },

  // Placeholder values; to be filled with real FARS/KYTC figures.
  trafficStats: {
    totalCrashes: 0,
    totalFatalities: 0,
    motorcycleFatalities: 0,
    speedRelatedFatalities: null,
    speedRelatedPct: null,
    alcoholRelatedFatalities: null,
    alcoholRelatedPct: null,
    unrestrainedFatalities: 0,
    distractedDrivingFatalCrashes: 0,
    urbanFatalities: null,
    ruralFatalities: null,
    reportYear: 2023,
    sourceLabel: "KYTC 2023",
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

  competitiveData: kentuckyCompetitiveData,

  content: {
    heroSubtitle:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Kentucky — combining KYTC crash data, demographics, judicial profiles, and market opportunity signals across Louisville, Lexington, Bowling Green, Owensboro, and Covington. Population ~4.5M.",

    legalLandscape:
      "Kentucky follows pure comparative fault — plaintiffs may recover even if primarily at fault, with damages reduced proportionally by their share (KRS § 411.182). The personal injury statute of limitations is one year from the date of injury (KRS § 413.140) — one of the shortest general PI deadlines in the country. Kentucky is a no-fault auto insurance state: personal injury protection (PIP) coverage must be exhausted before a tort claim can proceed for most injuries. A tort threshold must be met to bring suit; plaintiff firms should verify current threshold requirements. Motor-vehicle claims under Kentucky's MVRA follow a separate two-year rule (KRS 304.39-230(6)) tied to PIP payment timing, distinct from the one-year general PI SOL. There is no statutory cap on non-economic damages in general personal injury cases.",

    autoAudience:
      "Kentucky's road network is anchored by I-65 running north–south through Louisville, I-64 running east–west through Louisville and Lexington, I-71 connecting Louisville to Cincinnati, and I-75 running north–south through Lexington and Covington. Louisville and Lexington are the dominant population centers. Kentucky's no-fault PIP requirement means intake messaging must be calibrated for threshold-crossing cases. Motor-vehicle cases governed by Kentucky's MVRA follow a separate two-year rule under KRS 304.39-230(6), measured from the last basic or added reparation (PIP) payment, with an outer cap of four years from the accident date. Plaintiff firms should track PIP payment timing as a distinct deadline from the general one-year PI SOL.",

    truckAudience:
      "Kentucky is crossed by major interstate routes — I-65, I-64, I-71, and I-75 — that carry significant commercial-vehicle traffic. Commercial-vehicle incidents on these corridors often involve out-of-state carriers, which can affect jurisdiction and carrier insurance structure.",

    motorcycleAudience:
      "Kentucky requires helmets for all motorcycle operators and passengers. Kentucky's one-year statute of limitations applies equally to motorcycle injury cases — immediate intake is essential.",

    constructionAudience:
      "Kentucky has an active construction market, with Louisville and Lexington driving the majority of commercial and residential development volume. Workers' comp is mandatory, but third-party tort claims against contractors, architects, and property owners are common in multi-party construction PI. Workers and families of injured workers — especially subcontractor laborers — are the primary target audience.",

    ruralUrbanContext:
      "Kentucky has urban population centers in Louisville, Lexington, and Covington (Cincinnati metro), with extensive rural areas across the eastern mountains (Appalachia), the western coalfields, and the central Bluegrass. Rural areas have longer EMS response times and more limited trauma center access. PI firms targeting rural Kentucky should consider broadcast and outdoor alongside digital given lower population density in non-metro counties.",

    judicialContext:
      "Kentucky has major court complexes in its largest population centers: Jefferson County (Louisville), Fayette County (Lexington), Warren County (Bowling Green), Daviess County (Owensboro), and Kenton County (Covington). Venue is determined by plaintiff residency or incident location. Plaintiff firms should evaluate the specific court of venue for each case.",

    marketSaturationTitle: "Louisville / Lexington vs. Secondary Market Opportunity",
    marketSaturationTip:
      "The Louisville and Lexington DMAs have the highest PI advertiser density in Kentucky. Bowling Green, Owensboro, and Covington are materially less saturated, with lower media CPMs and fewer competing plaintiff firm brands. Firms with statewide capacity may find favorable cost-per-case dynamics in secondary Kentucky markets.",

    freightCorridorTitle: "I-65 / I-64 Interstate Corridors",
    freightCorridorTip:
      "I-65 runs north–south through Louisville connecting Nashville to Indianapolis. I-64 runs east–west through Louisville and Lexington connecting St. Louis to Charleston, WV. Commercial-vehicle cases on these routes may involve out-of-state carriers and multi-state insurance structures.",

    solUrgencyTitle: "1-Year SOL + No-Fault Threshold — Critical Urgency",
    solUrgencyTip:
      "Kentucky's one-year statute of limitations is among the shortest for general PI in the country, and the no-fault PIP threshold adds a second intake filter. Cases must both meet the tort threshold and be filed within one year of injury. Plaintiff firms advertising in Kentucky must have fast intake processes, immediate attorney review for any injury inquiry, and clear client communication about the one-year deadline.",

    internetAccessTitle: "Rural Kentucky Media Mix",
    internetAccessTip:
      "Rural Kentucky — particularly eastern Appalachia and the western coalfield counties — has lower population density and more limited broadband infrastructure than the Louisville and Lexington metros. PI firms targeting these areas should consider a broader media mix including local broadcast radio and regional outdoor alongside digital.",
  },
};
