export interface CompetitiveAdvertiser {
  advertiser: string;
  parent: string;
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
  totalAdvertisers: Record<string, number>;
}
