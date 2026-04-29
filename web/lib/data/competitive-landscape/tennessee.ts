import type { CompetitiveLandscapeData } from "./types";

// TODO: Enrich Tennessee firm/advertiser data via the competitive-landscape pipeline.
// Markets to populate: Nashville, Memphis, Knoxville, Chattanooga.
export const tennesseeCompetitiveData: CompetitiveLandscapeData = {
  state: "Tennessee",
  markets: ["Nashville", "Memphis", "Knoxville", "Chattanooga"],
  practiceAreas: [],
  data: {
    Nashville: [],
    Memphis: [],
    Knoxville: [],
    Chattanooga: [],
  },
  dataMonth: "",
  totalAdvertisers: {
    Nashville: 0,
    Memphis: 0,
    Knoxville: 0,
    Chattanooga: 0,
  },
};
