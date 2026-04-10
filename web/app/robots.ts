import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        disallow: [
          "/dashboard",
          "/ad-saturation",
          "/opportunity",
          "/markets",
          "/fatalities",
          "/judicial-profiles",
          "/pi-viability",
          "/market-demographics",
          "/cancer-incidence",
          "/mdl-tracker",
          "/login",
          "/auth",
        ],
      },
    ],
  };
}
