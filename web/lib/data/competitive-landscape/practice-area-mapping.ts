export interface PracticeAreaMapping {
  slug: string;
  label: string;
  keywords: string[]; // lowercase keywords to match against advertiser names
}

export const PRACTICE_AREA_MAPPINGS: PracticeAreaMapping[] = [
  // Mass Torts (from tort profile pages)
  {
    slug: "depo-provera",
    label: "Depo-Provera",
    keywords: ["depo-provera", "depo provera", "medroxyprogesterone"],
  },
  {
    slug: "roundup",
    label: "Roundup",
    keywords: ["roundup", "glyphosate"],
  },
  {
    slug: "hair-relaxer",
    label: "Hair Relaxer",
    keywords: ["hair relaxer", "hair straightener"],
  },
  {
    slug: "talcum-powder",
    label: "Talcum Powder",
    keywords: ["talcum", "talc", "baby powder"],
  },
  {
    slug: "paraquat",
    label: "Paraquat",
    keywords: ["paraquat"],
  },
  {
    slug: "afff-firefighting-foam",
    label: "AFFF / Firefighting Foam",
    keywords: ["afff", "firefighter foam", "firefighting foam", "pfas"],
  },
  {
    slug: "bard-powerport",
    label: "Bard PowerPort",
    keywords: ["bard", "powerport"],
  },
  {
    slug: "social-media-addiction",
    label: "Social Media Addiction",
    keywords: ["social media"],
  },
  {
    slug: "roblox-abuse",
    label: "Roblox Child Exploitation",
    keywords: ["roblox"],
  },
  {
    slug: "glp1-gastroparesis",
    label: "GLP-1 Gastroparesis",
    keywords: [
      "ozempic",
      "mounjaro",
      "glp-1",
      "glp1",
      "wegovy",
      "gastroparesis",
    ],
  },
  {
    slug: "glp1-vision-loss",
    label: "GLP-1 Vision Loss",
    keywords: ["ozempic vision", "naion"],
  },
  {
    slug: "lyft-sexual-assault",
    label: "Lyft Sexual Assault",
    keywords: ["lyft"],
  },
  {
    slug: "uber-sexual-assault",
    label: "Uber Sexual Assault",
    keywords: ["uber sexual"],
  },
  {
    slug: "nec",
    label: "NEC",
    keywords: ["nec ", "necrotizing"],
  },
  {
    slug: "camp-lejeune",
    label: "Camp Lejeune",
    keywords: ["camp lejeune"],
  },
  {
    slug: "mesothelioma",
    label: "Mesothelioma / Asbestos",
    keywords: ["asbestos", "mesothelioma"],
  },
  {
    slug: "tylenol-acetaminophen",
    label: "Tylenol / Acetaminophen",
    keywords: ["tylenol", "acetaminophen"],
  },
  // Additional torts found in advertising data
  {
    slug: "nursing-home-abuse",
    label: "Nursing Home Abuse",
    keywords: ["nursing home"],
  },
  {
    slug: "rideshare-assault",
    label: "Rideshare Assault",
    keywords: ["rideshare"],
  },
  {
    slug: "9-11-victim-fund",
    label: "9/11 Victim Fund",
    keywords: ["9/11"],
  },
  {
    slug: "antacid-zantac",
    label: "Antacid / Zantac",
    keywords: ["antacid", "zantac"],
  },
  {
    slug: "hernia-mesh",
    label: "Hernia Mesh",
    keywords: ["hernia mesh"],
  },
  {
    slug: "birth-control",
    label: "Birth Control",
    keywords: ["birth control"],
  },
  // Catch-all
  {
    slug: "pi-general",
    label: "PI / General",
    keywords: [], // matches everything else
  },
];

/**
 * Classify an advertiser name into a practice area using keyword matching.
 * Returns the label of the first matching practice area, or "PI / General" as fallback.
 */
export function classifyAdvertiser(advertiserName: string): string {
  const lower = advertiserName.toLowerCase();
  for (const mapping of PRACTICE_AREA_MAPPINGS) {
    if (mapping.slug === "pi-general") continue; // skip catch-all
    if (mapping.keywords.some((kw) => lower.includes(kw))) {
      return mapping.label;
    }
  }
  return "PI / General";
}

/**
 * Get all practice area labels for the dropdown.
 * Sorted alphabetically with "PI / General" at the end.
 */
export function getAllPracticeAreas(): string[] {
  const areas = PRACTICE_AREA_MAPPINGS.filter(
    (m) => m.slug !== "pi-general"
  ).map((m) => m.label);
  areas.sort((a, b) => a.localeCompare(b));
  areas.push("PI / General");
  return areas;
}
