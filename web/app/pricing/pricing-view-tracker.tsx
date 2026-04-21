"use client";

import { useEffect } from "react";
import { trackPricingPageView } from "@/lib/analytics";

export function PricingViewTracker() {
  useEffect(() => {
    trackPricingPageView();
  }, []);

  return null;
}
