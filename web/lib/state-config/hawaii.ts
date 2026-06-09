import { hawaiiCompetitiveData } from "@/lib/data/competitive-landscape/hawaii";
import type { StateConfig } from "./_types";

export const hawaiiConfig: StateConfig = {
  slug: "hawaii",
  stateCode: "HI",
  stateName: "Hawaii",

  metadata: {
    title: "Hawaii State Intelligence | Legal Marketing Intelligence",
    description:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Hawaii — combining FARS crash data, demographics, judicial profiles, and market opportunity signals across Oahu (Honolulu), Maui, Hawaii Island, and Kauai.",
  },

  // Source: NHTSA FARS 2024 Annual Report File. Hawaii reports through a single
  // statewide system; FARS is the authoritative fatality source. Non-fatality
  // counts (totalCrashes) and motorcycle/speed/restraint/distraction breakouts
  // are not carried in our FARS extract — left 0/null rather than inferred.
  trafficStats: {
    totalCrashes: 0, // not in FARS; would require Hawaii DOT crash report
    totalFatalities: 102,
    motorcycleFatalities: null, // not in our FARS extract for HI
    speedRelatedFatalities: null,
    speedRelatedPct: null,
    alcoholRelatedFatalities: 31,
    alcoholRelatedPct: 30.4,
    unrestrainedFatalities: 0, // not in our FARS extract for HI
    distractedDrivingFatalCrashes: 0, // not in our FARS extract for HI
    urbanFatalities: 89,
    ruralFatalities: 13,
    reportYear: 2024,
    sourceLabel: "FARS 2024 Annual Report File",
  },

  // Source: BLS Census of Fatal Occupational Injuries — Hawaii 2023
  // (https://www.bls.gov/regions/west/news-release/fatalworkinjuries_hawaii.htm).
  // Hawaii recorded 16 total fatal work injuries in 2023. BLS publishes two
  // sub-figures for Hawaii: "contact with objects and equipment" = 3 (19% of the
  // state total) and the private construction industry sector = 3. Other
  // event/industry cells do not meet publication standards and are left 0.
  // showWorkplaceSection is false because the full breakdown matrix is mostly
  // suppressed. Employment totals are left 0 (not separately verified).
  workplaceStats: {
    totalEmployment: 0,
    qcewCoveredEmployment: 0,
    totalWorkplaceFatalities: 16,
    constructionFatalities: 3, // BLS published: private construction sector = 3 (2023)
    constructionPctTotal: 18.75, // 3 / 16
    transportWarehouseFatalities: 0, // not publishable in CFOI 2023 HI breakout
    truckTransportFatalities: null, // not publishable
    fallsSlipsTrips: 0, // not publishable
    transportationIncidents: 0, // not publishable
    reportYear: 2023,
  },

  // Source: U.S. Census ACS 2024 1-year estimates (B08006 drive-alone share;
  // B08013 aggregate travel time / B08303 commuters for mean commute).
  commuteStats: {
    driveAlone: 65.1,
    nationalAvg: 68.7,
    avgCommuteMinutes: 26.7,
  },

  competitiveData: hawaiiCompetitiveData,

  features: {
    // CFOI 2023 industry/event breakdown is suppressed for Hawaii; only the
    // statewide total (16) is publishable, so the workplace section is hidden.
    showWorkplaceSection: false,
  },

  content: {
    heroSubtitle:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Hawaii — combining FARS crash data, demographics, judicial profiles, and market opportunity signals across Oahu (Honolulu), Maui, Hawaii Island, and Kauai. The entire state is a single Nielsen DMA (Honolulu). Population ~1.4M, plus roughly 10 million visitors a year.",

    legalLandscape:
      "Hawaii follows modified comparative negligence under the 51% bar rule: a plaintiff recovers only if their share of fault is not greater than the combined negligence of the defendants, and recovery is barred when the plaintiff's fault exceeds 50% (HRS § 663-31). The personal injury statute of limitations is two years from the date of injury (HRS § 657-7). Critically, Hawaii is a no-fault auto insurance state (HRS ch. 431:10C): personal injury protection (PIP) benefits pay an injured person's medical and related losses regardless of fault, and a claimant may only step outside the no-fault system to pursue a separate tort claim for pain and suffering once a statutory threshold is met — generally when reasonable medical expenses exceed the tort-threshold amount set under the no-fault law, or when the injury involves death, significant permanent loss of use of a body part, or permanent and serious disfigurement. That threshold shapes which auto cases are economically viable to advertise for. The First Circuit (Honolulu, Oahu) handles the large majority of the state's civil litigation.",

    autoAudience:
      "Hawaii's fatal-crash exposure concentrates on Oahu, where most of the state's 1.4M residents and the bulk of vehicle miles are. Statewide, FARS recorded 102 traffic fatalities in 2024, of which 89 occurred in urban areas and 13 in rural areas — the highest urban share of any state, reflecting how concentrated Hawaii's road network is around Honolulu. Drive-alone commuting (65.1%) runs slightly below the national average (68.7%), with The Bus transit on Oahu and dense urban corridors raising the non-single-occupant share. The H-1, H-2, and H-3 interstates on Oahu, plus the Pali and Likelike highways, are the primary urban crash corridors. Because Hawaii is a no-fault PIP state (HRS ch. 431:10C), auto creative should educate consumers that pain-and-suffering recovery requires meeting the tort threshold — a message most mainland-style 'injured in a wreck' ads skip.",

    truckAudience:
      "Hawaii has no interstate freight corridors in the mainland sense — all goods arrive by ocean or air and move locally by truck from the Honolulu and Kalaeloa harbors. Commercial-vehicle PI exposure is concentrated around the Port of Honolulu, the Oahu industrial areas (Kalihi, Mapunapuna, Campbell Industrial Park), and inter-island freight distribution on the neighbor islands. There is no long-haul trucking segment, so commercial-vehicle case acquisition leans toward delivery, construction haul, tour-bus, and shuttle operators rather than interstate carriers.",

    motorcycleAudience:
      "Hawaii requires helmets only for riders and passengers under 18 (HRS § 286-81); adult riders are not required to wear helmets, which raises the severity of motorcycle and moped injuries relative to mandatory-helmet states. Moped and scooter use is heavy in tourist districts (Waikiki, Lahaina before the 2023 fire, Kona), and many riders are visitors unfamiliar with Hawaii roads and the state's no-fault and 2-year-SOL framework. Our FARS extract does not carry a Hawaii motorcycle-fatality count, so no figure is shown here; rider exposure should be treated as material but unquantified pending a state-DOT figure.",

    ruralUrbanContext:
      "Hawaii's fatality split is unusually urban-weighted: 89 of 102 FARS 2024 fatalities (87%) were urban, with only 13 rural. That reflects population concentration on Oahu and the classification of most populated areas as urban. The practical takeaway is the opposite of most mainland states — Hawaii case volume is overwhelmingly an Oahu / Honolulu-metro phenomenon, and neighbor-island (Maui, Hawaii Island, Kauai) campaigns address smaller, more dispersed populations plus a rotating visitor base rather than a large resident rural market.",

    judicialContext:
      "The First Circuit Court in Honolulu (Oahu) hears the bulk of Hawaii's civil and PI litigation; the Second (Maui), Third (Hawaii Island), and Fifth (Kauai) Circuits handle neighbor-island matters. Hawaii has a relatively small, generalist civil bench, and venue is largely a function of where the injury occurred or where the defendant resides. Because tourism injury cases frequently involve out-of-state plaintiffs and resort or activity-operator defendants, venue and personal-jurisdiction questions are more common here than in most states.",

    marketSaturationTitle: "Honolulu (Oahu) vs. Neighbor Islands",
    marketSaturationTip:
      "All of Hawaii is a single Nielsen DMA (Honolulu), so broadcast TV and radio buys reach the entire state from Oahu-based stations — there is no separate metered market for Maui, Hawaii Island, or Kauai. Oahu carries the large majority of resident population and case volume and draws the highest PI advertiser concentration. Neighbor-island reach comes bundled with the Honolulu DMA buy, which means firms can extend coverage to Maui, Hilo-Kona, and Kauai at low marginal cost — useful for capturing dispersed and visitor-driven cases that a mainland multi-DMA plan would treat as separate markets.",

    solUrgencyTitle: "2-Year SOL + No-Fault Threshold",
    solUrgencyTip:
      "Hawaii's personal injury statute of limitations is two years from the date of injury (HRS § 657-7). For auto cases the clock matters alongside the no-fault tort threshold (HRS ch. 431:10C): an injured person may not pursue a pain-and-suffering claim until medical expenses cross the statutory threshold, but the 2-year limit keeps running regardless. Visitors injured on vacation often return to the mainland before realizing they have a claim. Fast intake, early documentation of PIP-covered treatment, and prompt assessment of whether the tort threshold is met are essential to protect the case before the SOL bars it.",

    outOfStateTitle: "Visitor & Inter-Island Injury Exposure",
    outOfStateTip:
      "Hawaii hosts on the order of 10 million visitors a year, and a large share of injury claims involve out-of-state tourists — rental-car crashes, moped and scooter wrecks, resort and activity-operator incidents, and inter-island travel. These claimants typically do not know local PI counsel, Hawaii's 2-year SOL, or the no-fault PIP system, and they often leave the state within days. Geo-targeted digital around airports, resort corridors (Waikiki, Wailea-Kihei, Kona, Princeville), and rental-car and activity-booking touchpoints can reach injured visitors before they engage mainland counsel. Inter-island travel and multi-defendant resort cases also add venue and jurisdiction complexity that local firms are positioned to handle.",

    footerSourcesLabel:
      "NHTSA FARS 2024 Annual Report File; BLS CFOI Hawaii 2023; U.S. Census ACS 2024 1-year estimates",

    keyTakeaways: [
      "Modified comparative negligence with a 51% bar — recovery is barred when the plaintiff's fault exceeds 50% (HRS § 663-31).",
      "No-fault auto state (HRS ch. 431:10C): PIP pays regardless of fault, and a tort threshold must be met before a pain-and-suffering claim is allowed — shapes which auto cases are worth advertising for.",
      "2-year personal injury SOL (HRS § 657-7); fast intake matters especially for visitors who leave the state quickly.",
      "Single statewide Nielsen DMA (Honolulu) — one broadcast buy covers all islands; Oahu carries most resident case volume.",
      "Heavy out-of-state visitor and inter-island injury exposure adds venue, jurisdiction, and rental/activity-operator complexity.",
    ],
  },

  // No injuryData yet; add when Hawaii state-DOT deep crash data is integrated.
};
