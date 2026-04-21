export interface CompetitiveAdvertiser {
  advertiser: string;
  parent: string;
  /** Reclassified at render time by classifyAdvertiser() from practice-area-mapping.ts */
  practiceArea: string;
  instances: number;
  outlets: number;
  tvOutlets: number;
  radioOutlets: number;
  nationalMarkets: number;
  googleAds?: boolean;
  youtube?: boolean;
  meta?: boolean;
  tiktok?: boolean;
}

export interface CompetitiveLandscapeData {
  state: string;
  markets: string[];
  practiceAreas: string[];
  data: Record<string, CompetitiveAdvertiser[]>;
  dataMonth: string;
  digitalPresenceCheckedAt?: string;
  totalAdvertisers: Record<string, number>;
}
