export type TortId = "roundup" | "pfas" | "camp_lejeune" | "talc";

export interface TortMdl {
  number: number;
  label: string;
}

export interface TortConfig {
  id: TortId;
  label: string;
  shortLabel: string;
  mdls: TortMdl[];
  cancerSites: string[];
  description: string;
  exposureProxy: string;
  color: string;
  tagline: string;
  stateExposureSignals: Record<string, string>;
  defaultExposureSignal: string;
  marketInsight: string;
}

export const TORTS: Record<TortId, TortConfig> = {
  roundup: {
    id: "roundup",
    label: "Roundup / Glyphosate",
    shortLabel: "Roundup",
    mdls: [{ number: 2741, label: "Monsanto Roundup (MDL 2741)" }],
    cancerSites: ["Non-Hodgkin Lymphoma"],
    description:
      "Glyphosate herbicide (Roundup) has been linked to Non-Hodgkin Lymphoma in agricultural workers and others with repeated exposure.",
    exposureProxy: "agricultural herbicide use",
    color: "#10B981",
    tagline:
      "Target states with high NHL rates and heavy agricultural herbicide use",
    stateExposureSignals: {
      Iowa: "Ranks #2 nationally in corn and soybean acreage with historically high glyphosate application rates.",
      Illinois:
        "One of the top glyphosate-using states, with millions of acres of corn and soybean production.",
      Kansas:
        "Major wheat and corn producer with extensive herbicide use throughout the growing region.",
      Nebraska:
        "High agricultural intensity state with significant glyphosate application on row crops.",
      Minnesota:
        "Major soybean producer with high agricultural density and documented glyphosate use.",
      Indiana:
        "Heavy corn and soybean production with high herbicide application rates statewide.",
      Ohio: "Large agricultural footprint with significant glyphosate use on field crops.",
      Missouri:
        "Significant corn and soybean production with extensive chemical agricultural inputs.",
      "North Dakota":
        "High per-acre herbicide use; wheat, canola, and soy production intensive.",
      "South Dakota":
        "Agricultural-heavy state with significant herbicide application across crop types.",
    },
    defaultExposureSignal:
      "State has documented agricultural herbicide use.",
    marketInsight:
      "Prioritize rural agricultural states where NHL rates exceed 25 per 100K and farming communities have documented glyphosate exposure histories.",
  },
  pfas: {
    id: "pfas",
    label: "PFAS / AFFF (Firefighting Foam)",
    shortLabel: "PFAS / AFFF",
    mdls: [
      { number: 2885, label: "AFFF Products Liability (MDL 2885)" },
      { number: 2433, label: "PFAS Water Contamination (MDL 2433)" },
    ],
    cancerSites: ["Kidney & Renal Pelvis", "Bladder", "Prostate"],
    description:
      "Per- and polyfluoroalkyl substances (PFAS) used in firefighting foam (AFFF) have contaminated water supplies near military bases and airports, linked to kidney, bladder, and prostate cancers.",
    exposureProxy: "military base & airport PFAS contamination",
    color: "#2563EB",
    tagline:
      "Target counties near military bases and airports with documented PFAS water contamination",
    stateExposureSignals: {
      Colorado:
        "Multiple Air Force bases with documented AFFF use including Peterson and Schriever.",
      Alabama:
        "Anniston Army Depot and Maxwell AFB; documented PFAS contamination in public water.",
      Michigan:
        "Wurtsmith AFB (Oscoda) site has one of the most documented AFFF/PFAS contaminations nationally.",
      "New Hampshire":
        "Pease Air Force Base PFAS contamination linked to elevated cancer rates in Newington and Portsmouth.",
      "North Carolina":
        "Multiple military installations including Camp Lejeune (separate tort) and Seymour-Johnson AFB.",
      California:
        "Edwards AFB, Vandenberg SFB, and multiple Air National Guard sites with documented PFAS.",
      Alaska:
        "Eielson and Elmendorf AFBs with documented PFAS contamination in surrounding communities.",
      Florida:
        "Eglin AFB, Tyndall AFB, and multiple Navy installations with documented AFFF use.",
      Ohio: "Wright-Patterson AFB with documented PFAS contamination of surrounding water systems.",
      Virginia:
        "Dense military corridor; Naval Station Norfolk and Langley AFB with AFFF histories.",
    },
    defaultExposureSignal:
      "State has military installations with documented or likely AFFF/PFAS use.",
    marketInsight:
      "Focus on counties within 5 miles of former military airbases and fire training areas with documented PFAS contamination, especially where public water systems show elevated PFAS levels.",
  },
  camp_lejeune: {
    id: "camp_lejeune",
    label: "Camp Lejeune Water Contamination",
    shortLabel: "Camp Lejeune",
    mdls: [{ number: 3049, label: "Camp Lejeune Water Litigation (MDL 3049)" }],
    cancerSites: ["Kidney & Renal Pelvis", "Bladder", "Non-Hodgkin Lymphoma"],
    description:
      "Marines and family members who lived or worked at Camp Lejeune, NC between 1953\u20131987 were exposed to contaminated drinking water linked to multiple cancers including kidney cancer, bladder cancer, and Non-Hodgkin Lymphoma.",
    exposureProxy: "veteran population & Camp Lejeune residency history",
    color: "#7C3AED",
    tagline:
      "Target states with high veteran populations and elevated rates of Camp Lejeune-linked cancers",
    stateExposureSignals: {
      "North Carolina":
        "Home to Camp Lejeune; highest concentration of directly affected residents and veterans.",
      California:
        "Largest veteran population by count; many former Marines relocated post-service.",
      Texas:
        "Second largest veteran population with significant USMC veteran concentration.",
      Florida:
        "Major veteran retirement destination with high former military presence.",
      Virginia:
        "Dense active and veteran military population; proximity to Camp Lejeune corridor.",
      Georgia:
        "Fort Benning and significant Marine veteran population; high veteran density.",
      "South Carolina":
        "Adjacent to NC; many former Camp Lejeune service members relocated here.",
      Pennsylvania:
        "Large veteran population with significant WWII/Korea/Vietnam-era Marine veterans.",
      "New York":
        "Large absolute veteran population; significant historical Marine presence.",
      Ohio: "Large veteran population with significant exposure-era service members (1953\u20131987).",
    },
    defaultExposureSignal:
      "State has a significant veteran population who may have served at or near Camp Lejeune during 1953\u20131987.",
    marketInsight:
      "The Camp Lejeune Justice Act (2022) opened a 2-year filing window. Target states with the highest concentrations of Marines and family members who lived at Lejeune between 1953 and 1987.",
  },
  talc: {
    id: "talc",
    label: "Talcum Powder / Johnson & Johnson",
    shortLabel: "Talc / J&J",
    mdls: [{ number: 2738, label: "J&J Talcum Powder (MDL 2738)" }],
    cancerSites: ["Ovary"],
    description:
      "Johnson & Johnson talcum powder products have been linked to ovarian cancer in women who used them for feminine hygiene. J&J paid billions in settlements while denying liability.",
    exposureProxy:
      "ovarian cancer incidence and female demographic concentration",
    color: "#EC4899",
    tagline:
      "Target states with elevated ovarian cancer rates among the primary demographic of long-term talc users",
    stateExposureSignals: {
      Mississippi:
        "Highest ovarian cancer incidence rates nationally; significant talc market penetration historically.",
      Arkansas:
        "Elevated ovarian cancer rates with historically high J&J product market share.",
      Alabama:
        "High ovarian cancer incidence; strong historical consumer product market for talc.",
      "West Virginia":
        "Elevated cancer rates including ovarian; historically significant product use.",
      Kentucky:
        "Above-average ovarian cancer incidence; significant rural market historically served by J&J.",
      Oklahoma:
        "Above-average ovarian cancer rates with historical talc product use.",
      Tennessee:
        "Moderate to high ovarian cancer incidence with historical consumer product market.",
      Louisiana:
        "Elevated ovarian cancer rates; warm climate historically associated with talc product use.",
      "South Carolina":
        "Above-average ovarian cancer incidence rates.",
      Indiana:
        "Moderate ovarian cancer rates with historical consumer product market presence.",
    },
    defaultExposureSignal:
      "State has documented ovarian cancer rates relevant to talc litigation demographics.",
    marketInsight:
      "Focus on women aged 50+ who used Johnson's Baby Powder or Shower-to-Shower for feminine hygiene for 10+ years. Southern states show both the highest ovarian cancer rates and the strongest historical J&J consumer product market.",
  },
};

export const NATIONAL_AVERAGES: Record<string, number> = {
  "Non-Hodgkin Lymphoma": 19.6,
  "Kidney & Renal Pelvis": 17.8,
  Bladder: 20.1,
  Prostate: 111.7,
  Ovary: 11.2,
};

const VALID_TORT_IDS = new Set<string>(["roundup", "pfas", "camp_lejeune", "talc"]);

export function parseTortId(val: string | undefined): TortId | null {
  if (!val || !VALID_TORT_IDS.has(val)) return null;
  return val as TortId;
}
