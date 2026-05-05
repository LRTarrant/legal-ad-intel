/**
 * PI Geo Targeting page (PR D).
 *
 * URL: /pi-geo-targeting/[state]/[category]
 *   e.g. /pi-geo-targeting/AL/car_accident
 *
 * Server component: validates params, kicks the user out for malformed
 * requests, and renders the client component which fetches the report
 * client-side via /api/pi/geo-targeting (so the CSV download button can
 * hit the same URL with format=csv).
 *
 * Why client-side fetch instead of SSR'ing the report: the dedicated
 * page is meant to feel like a tool — sort, filter, export. The data
 * needs to live in client state for the sortable table to work
 * smoothly. Server-fetching just to JSON-stringify it back into the
 * page would double the work.
 */

import { notFound } from "next/navigation";
import {
  GeoTargetingClient,
  type GeoTargetingPageParams,
} from "./geo-targeting-client";

const VALID_CATEGORIES = new Set([
  "car_accident",
  "truck_accident",
  "motorcycle_accident",
  "pedestrian_accident",
  "bicycle_accident",
]);

function isValidStateCode(s: string): boolean {
  return /^[A-Z]{2}$/.test(s);
}

interface PageProps {
  params: Promise<{ state: string; category: string }>;
}

export default async function Page({ params }: PageProps) {
  const { state: rawState, category: rawCategory } = await params;
  const state = rawState.toUpperCase();
  const category = rawCategory;
  if (!isValidStateCode(state) || !VALID_CATEGORIES.has(category)) {
    notFound();
  }
  const safe: GeoTargetingPageParams = {
    state,
    pi_category: category as GeoTargetingPageParams["pi_category"],
  };
  return <GeoTargetingClient params={safe} />;
}

export const dynamic = "force-dynamic";
