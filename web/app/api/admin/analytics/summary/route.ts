import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/roles";
import { getGa4Client, getGa4Config, rowsFromResponse } from "@/lib/ga4";
import { resolveFromParams, daysBetween } from "@/lib/analytics-timeframe";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const OVERVIEW_METRICS = [
  { name: "activeUsers" },
  { name: "sessions" },
  { name: "screenPageViews" },
  { name: "engagementRate" },
];

const TABLE_METRICS = [
  { name: "activeUsers" },
  { name: "sessions" },
  { name: "screenPageViews" },
  { name: "engagementRate" },
];

export async function GET(req: NextRequest) {
  const supabase = await createClient();

  const sp = req.nextUrl.searchParams;
  const { startDate, endDate } = resolveFromParams(
    sp.get("startDate"),
    sp.get("endDate"),
  );
  const DATE_RANGE = { startDate, endDate };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!isAdmin(profile?.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const cfg = getGa4Config();
  const client = getGa4Client();
  if (!cfg || !client) {
    return NextResponse.json(
      {
        error:
          "Google Analytics is not configured. Set GA4_PROPERTY_ID, GA_CLIENT_ID, GA_CLIENT_SECRET, and GA_REFRESH_TOKEN.",
      },
      { status: 503 },
    );
  }

  const property = `properties/${cfg.propertyId}`;
  const usOnlyFilter = {
    filter: {
      fieldName: "country",
      stringFilter: { matchType: "EXACT" as const, value: "United States" },
    },
  };

  try {
    const [
      overviewRes,
      sourcesRes,
      pagesRes,
      countriesRes,
      statesRes,
      citiesRes,
    ] = await Promise.all([
      client.runReport({
        property,
        dateRanges: [DATE_RANGE],
        metrics: OVERVIEW_METRICS,
      }),
      client.runReport({
        property,
        dateRanges: [DATE_RANGE],
        dimensions: [{ name: "sessionSourceMedium" }],
        metrics: TABLE_METRICS,
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 25,
      }),
      client.runReport({
        property,
        dateRanges: [DATE_RANGE],
        dimensions: [{ name: "pagePath" }, { name: "pageTitle" }],
        metrics: TABLE_METRICS,
        orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
        limit: 25,
      }),
      client.runReport({
        property,
        dateRanges: [DATE_RANGE],
        dimensions: [{ name: "country" }],
        metrics: TABLE_METRICS,
        orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
        limit: 25,
      }),
      client.runReport({
        property,
        dateRanges: [DATE_RANGE],
        dimensions: [{ name: "region" }],
        metrics: TABLE_METRICS,
        dimensionFilter: usOnlyFilter,
        orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
        limit: 25,
      }),
      client.runReport({
        property,
        dateRanges: [DATE_RANGE],
        dimensions: [{ name: "city" }, { name: "region" }],
        metrics: TABLE_METRICS,
        dimensionFilter: usOnlyFilter,
        orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
        limit: 25,
      }),
    ]);

    const overviewRow = rowsFromResponse(overviewRes[0])[0] ?? {};
    const overview = {
      activeUsers: Number(overviewRow.activeUsers ?? 0),
      sessions: Number(overviewRow.sessions ?? 0),
      screenPageViews: Number(overviewRow.screenPageViews ?? 0),
      engagementRate: Number(overviewRow.engagementRate ?? 0),
    };

    const countries = rowsFromResponse(countriesRes[0]);
    const usCountry = countries.find((c) => c.country === "United States");
    const totalUsers = countries.reduce(
      (sum, c) => sum + Number(c.activeUsers ?? 0),
      0,
    );
    const usUsers = Number(usCountry?.activeUsers ?? 0);
    const geoSplit = {
      totalUsers,
      usUsers,
      nonUsUsers: Math.max(0, totalUsers - usUsers),
    };

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      dateRange: { ...DATE_RANGE, days: daysBetween(startDate, endDate) },
      overview,
      sources: rowsFromResponse(sourcesRes[0]),
      pages: rowsFromResponse(pagesRes[0]),
      countries,
      geoSplit,
      states: rowsFromResponse(statesRes[0]),
      cities: rowsFromResponse(citiesRes[0]),
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch analytics";
    console.error("ga4 summary error:", err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
