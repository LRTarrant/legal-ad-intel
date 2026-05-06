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
    sourceLabel: "MassDOT 2023",
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
      "Massachusetts uses modified comparative negligence with a 51% bar — plaintiffs whose fault exceeds 50% cannot recover (M.G.L. c. 231, § 85). The personal injury statute of limitations is three years from the date of injury (M.G.L. c. 260, § 2A). Massachusetts imposes no statutory cap on non-economic or punitive damages in most PI cases. Massachusetts is a no-fault auto insurance state: PIP coverage ($8,000 default) must be exhausted before a tort claim can proceed for most injuries. The tort threshold — either a monetary threshold (~$2,000 in medical expenses) or a verbal threshold (death, permanent loss, etc.) — must be crossed to bring suit. Suffolk County (Boston) is the dominant plaintiff venue for high-value cases, with Middlesex and Norfolk counties as secondary plaintiff-friendly jurisdictions.",

    autoAudience:
      "Massachusetts has a compact, dense road network anchored by I-93, I-90 (the Mass Pike), and I-95/Route 128. The Boston metro drives-alone rate is suppressed by heavy MBTA commuter rail and subway use, but suburban and rural communities — Worcester, Springfield, the South Shore, and the Cape — are fully vehicle-dependent. I-90 east–west and I-95 north–south carry the highest crash-volume corridors. The no-fault PIP threshold requirement means intake messaging must be calibrated for threshold-crossing cases: fractures, surgery, long-term impairment, or fatality.",

    truckAudience:
      "Massachusetts is a northeastern freight hub. The I-90 Mass Pike carries heavy tractor-trailer volume between Boston and the New York State border. I-93 through the city core generates significant commercial-vehicle incidents. The Port of Boston (Conley Terminal) and the 128/495 logistics belt are major truck-traffic generators. Cases involving out-of-state carriers from I-90 and I-95 are common, often involving multi-state insurance and carrier compliance complexity.",

    motorcycleAudience:
      "Massachusetts requires helmets for riders under age 18 and operators with less than one year of licensing — experienced adult riders over 18 may legally ride without helmets. The Cape Cod, Pioneer Valley, and Berkshire routes draw strong seasonal riding volume from both Massachusetts residents and out-of-state visitors. The short riding season concentrates incidents in May–October. Helmet-free adult riders have stronger tort claims in catastrophic injury cases.",

    constructionAudience:
      "Boston is one of the most active construction markets in the country — the Seaport District, Route 128 corridor, and ongoing MBTA capital projects generate substantial worksite exposure. Massachusetts construction workers are primarily union-represented, with concentrated exposure in the building trades. The Construction Industry Fatality Program (M.G.L. c. 149) gives OSHA significant enforcement presence in Boston. Workers' comp is mandatory, but third-party tort claims against contractors, architects, and property owners are common in multi-party construction PI.",

    ruralUrbanContext:
      "Massachusetts is heavily urbanized — the Boston–Cambridge core and the Route 128 ring carry the majority of total crash volume. Rural fatality exposure exists in western Massachusetts (Berkshire, Franklin, Hampshire counties), where sparse EMS coverage and limited trauma center access elevate injury severity. Springfield and Pittsfield are the western anchor markets; rural Berkshire County has the lowest broadband penetration in the state. PI firms targeting western MA need broadcast and outdoor in addition to digital to reach rural households.",

    judicialContext:
      "Suffolk County (Boston) is Massachusetts' most plaintiff-favorable venue, with the highest average verdicts and a bench experienced in high-complexity PI matters. Middlesex County (Cambridge/Lowell) and Norfolk County (Dedham) are moderately plaintiff-friendly. Essex County (Salem/Lawrence) and Worcester County are more moderate. Hampshire and Berkshire counties are the lowest-volume venues and more variable in outcomes. For maximum case value, venue in Suffolk or Middlesex — wherever plaintiff residency or crash location permits — is the standard strategy.",

    marketSaturationTitle: "Boston Saturation vs. Worcester / Springfield Opportunity",
    marketSaturationTip:
      "The Boston DMA is among the most saturated PI advertising markets in New England — major national and regional firms compete aggressively on TV, digital, and radio. Worcester and Springfield are materially less saturated, with lower media CPMs and fewer plaintiff firm brands competing for share of voice. Firms expanding from Boston to Worcester or Springfield often find favorable cost-per-case dynamics and less brand noise.",

    freightCorridorTitle: "Mass Pike / I-93 Freight Corridor",
    freightCorridorTip:
      "The I-90 Mass Pike (Boston to the New York border) and I-93 (Boston north–south through the city core) are the primary freight corridors. The Mass Pike carries the highest truck volume east of Springfield. Trucking PI cases on these routes frequently involve out-of-state or Canadian carriers, and the Port of Boston generates drayage-route commercial-vehicle incidents within the city itself.",

    solUrgencyTitle: "3-Year SOL + No-Fault Threshold Urgency",
    solUrgencyTip:
      "Massachusetts' 3-year SOL is standard, but the real urgency is the no-fault PIP threshold: cases that don't cross the monetary or verbal threshold cannot proceed to tort. Early intake must confirm threshold-crossing injuries — medical expenses above ~$2,000, fracture, permanent injury, or death — to determine whether a tort case even exists. Firms that move fast on intake avoid spending time on cases that won't clear the threshold.",

    internetAccessTitle: "Western MA Digital Gap",
    internetAccessTip:
      "Berkshire, Franklin, and parts of Hampshire County have the lowest broadband penetration in Massachusetts. These western communities also have higher rates of uninsured motorists relative to the Boston metro. PI firms targeting western MA must include local radio (WFCR, WAQY) and regional outdoor alongside digital to reach injury victims in areas where streaming and mobile ad delivery is inconsistent.",

    outOfStateTitle: "Cape Cod / Martha's Vineyard / Nantucket Tourism Opportunity",
    outOfStateTip:
      "Cape Cod, Martha's Vineyard, and Nantucket collectively draw millions of out-of-state visitors annually — primarily from Connecticut, Rhode Island, New York, and New Jersey. Summer tourist season (Memorial Day–Labor Day) sees sharply elevated crash and boating incident rates on Route 6 (Cape), the Sagamore and Bourne Bridge approaches, and in island waters. Out-of-state visitors injured in Massachusetts may not know local plaintiff firms or the no-fault threshold rules. Geo-fenced digital along Route 6, Route 28, and the Bourne Bridge corridor during peak season captures high-value out-of-state injury cases.",

    footerSourcesLabel:
      "MassDOT — Massachusetts Crash Data — 2023 Annual Report",
  },
};
