import { massachusettsCompetitiveData } from "@/lib/data/competitive-landscape/massachusetts";
import type { StateConfig } from "./_types";

export const massachusettsConfig: StateConfig = {
  slug: "massachusetts",
  stateCode: "MA",
  stateName: "Massachusetts",

  metadata: {
    title: "Massachusetts State Intelligence | Legal Marketing Intelligence",
    description:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Massachusetts — combining state DOT crash data, demographics, judicial profiles, and market opportunity signals across Boston, Worcester, Springfield, Lowell, and New Bedford. Population ~7M.",
  },

  // Source: MassDOT 2023 crash data — placeholder values; to be filled with real FARS/MassDOT figures.
  trafficStats: {
    totalCrashes: 0,
    totalFatalities: 363, // FARS 2024 Annual Report File
    motorcycleFatalities: null,
    speedRelatedFatalities: null,
    speedRelatedPct: null,
    alcoholRelatedFatalities: 98, // FARS 2024 Annual Report File
    alcoholRelatedPct: 27.0, // 98 / 363 FARS 2024 Annual Report File
    unrestrainedFatalities: 0,
    distractedDrivingFatalCrashes: 0,
    urbanFatalities: 332, // FARS 2024 Annual Report File
    ruralFatalities: 30, // FARS 2024 Annual Report File
    reportYear: 2024,
    sourceLabel: "FARS 2024 Annual Report File",
  },

  // Source: BLS CFOI — Massachusetts 2023 — placeholder values; to be filled.
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

  // Source: U.S. Census ACS 5-year estimates — placeholder values; to be filled.
  commuteStats: {
    driveAlone: 0,
    nationalAvg: 68.7,
    avgCommuteMinutes: 0,
  },

  competitiveData: massachusettsCompetitiveData,

  content: {
    heroSubtitle:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Massachusetts — combining MassDOT crash data, demographics, judicial profiles, and market opportunity signals across Boston, Worcester, Springfield, Lowell, and New Bedford. Population ~7M.",

    legalLandscape:
      "Massachusetts uses modified comparative negligence with a 51% bar — plaintiffs whose fault exceeds 50% cannot recover (M.G.L. c. 231, § 85). The personal injury statute of limitations is three years from the date of injury (M.G.L. c. 260, § 2A). Massachusetts imposes no statutory cap on non-economic or punitive damages in most PI cases. Massachusetts is a no-fault auto insurance state: PIP coverage ($8,000 default) must be exhausted before a tort claim can proceed for most injuries. The tort threshold — either a monetary threshold (~$2,000 in medical expenses) or a verbal threshold (death, permanent loss, etc.) — must be crossed to bring suit.",

    autoAudience:
      "Massachusetts has a compact, dense road network anchored by I-93, I-90 (the Mass Pike), and I-95/Route 128. The Boston metro drive-alone rate is suppressed by MBTA commuter rail and subway use, but suburban and rural communities — Worcester, Springfield, and western Massachusetts — are fully vehicle-dependent. The no-fault PIP threshold requirement means intake messaging must be calibrated for threshold-crossing cases: fractures, surgery, long-term impairment, or fatality.",

    truckAudience:
      "Massachusetts is crossed by major interstate routes — I-90 (the Mass Pike) running east–west and I-93 and I-95 running north–south through the Boston area. Commercial-vehicle incidents on these corridors often involve out-of-state carriers, which can affect jurisdiction and carrier insurance structure.",

    motorcycleAudience:
      "Massachusetts requires helmets for riders under age 18 and operators with less than one year of licensing — experienced adult riders over 18 may legally ride without helmets. The riding season is short (roughly May–October), concentrating incidents in warmer months. Helmet-free adult riders may have distinct exposure in catastrophic injury cases.",

    constructionAudience:
      "Massachusetts has an active construction market, particularly in the Boston metro. Workers' comp is mandatory, but third-party tort claims against contractors, architects, and property owners are common in multi-party construction PI. Workers and families of injured workers — especially subcontractor laborers — are the primary target audience.",

    ruralUrbanContext:
      "Massachusetts is heavily urbanized — the Boston–Cambridge core and the Route 128 ring contain the majority of the state's population and vehicle miles traveled. Rural exposure exists in western Massachusetts (Berkshire, Franklin, Hampshire counties), where EMS response times are longer and trauma center access is more limited. Springfield and Pittsfield are the western anchor markets. PI firms targeting western MA should consider broadcast and outdoor alongside digital given lower population density.",

    judicialContext:
      "Massachusetts has major court complexes serving its largest population centers: Suffolk County (Boston), Middlesex County (Cambridge and Lowell), Essex County (Salem and Lawrence), Worcester County (Worcester), and Hampden County (Springfield). Venue is determined by plaintiff residency or incident location. Plaintiff firms should evaluate the specific court of venue for each case rather than relying on state-level generalizations.",

    marketSaturationTitle: "Boston Saturation vs. Worcester / Springfield Opportunity",
    marketSaturationTip:
      "The Boston DMA is among the most saturated PI advertising markets in New England — major national and regional firms compete aggressively on TV, digital, and radio. Worcester and Springfield are materially less saturated, with lower media CPMs and fewer plaintiff firm brands competing for share of voice. Firms expanding from Boston to Worcester or Springfield often find favorable cost-per-case dynamics and less brand noise.",

    freightCorridorTitle: "I-90 / I-93 Interstate Corridors",
    freightCorridorTip:
      "I-90 (the Mass Pike) runs east–west across the state from the New York border to Boston. I-93 and I-95 provide north–south access through the greater Boston area. Commercial-vehicle cases on these routes may involve out-of-state carriers and multi-state insurance structures.",

    solUrgencyTitle: "3-Year SOL + No-Fault Threshold Urgency",
    solUrgencyTip:
      "Massachusetts' 3-year SOL is standard, but the real urgency is the no-fault PIP threshold: cases that don't cross the monetary or verbal threshold cannot proceed to tort. Early intake must confirm threshold-crossing injuries — medical expenses above ~$2,000, fracture, permanent injury, or death — to determine whether a tort case even exists. Firms that move fast on intake avoid spending time on cases that won't clear the threshold.",

    internetAccessTitle: "Western MA Media Mix",
    internetAccessTip:
      "Western Massachusetts (Berkshire, Franklin, and Hampshire counties) has lower population density than the Boston metro. PI firms targeting these areas should consider a broader media mix — local broadcast radio and regional outdoor in addition to digital — to reach lower-density rural communities.",

  },

  features: {
    showWorkplaceSection: false,
  },
};
