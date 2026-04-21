export interface CompetitiveAdvertiser {
  advertiser: string;
  parent: string;
  practiceArea: string;
  instances: number;
  outlets: number;
  tvOutlets: number;
  radioOutlets: number;
  nationalMarkets: number;
}

export interface CompetitiveLandscapeData {
  state: string;
  markets: string[];
  practiceAreas: string[];
  data: Record<string, CompetitiveAdvertiser[]>;
  dataMonth: string;
  totalAdvertisers: Record<string, number>;
}
