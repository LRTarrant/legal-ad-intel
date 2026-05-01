import { BetaAnalyticsDataClient, protos } from "@google-analytics/data";
import { UserRefreshClient } from "google-auth-library";

type IRunReportResponse = protos.google.analytics.data.v1beta.IRunReportResponse;

let cachedClient: BetaAnalyticsDataClient | null = null;

export function getGa4Config() {
  const propertyId = process.env.GA4_PROPERTY_ID;
  const clientId = process.env.GA_CLIENT_ID;
  const clientSecret = process.env.GA_CLIENT_SECRET;
  const refreshToken = process.env.GA_REFRESH_TOKEN;

  if (!propertyId || !clientId || !clientSecret || !refreshToken) {
    return null;
  }

  return { propertyId, clientId, clientSecret, refreshToken };
}

export function getGa4Client(): BetaAnalyticsDataClient | null {
  if (cachedClient) return cachedClient;
  const cfg = getGa4Config();
  if (!cfg) return null;

  // OAuth2 user refresh token auth — used in place of service-account keys
  // because some Google Cloud orgs block service account key creation.
  const authClient = new UserRefreshClient({
    clientId: cfg.clientId,
    clientSecret: cfg.clientSecret,
    refreshToken: cfg.refreshToken,
  });

  cachedClient = new BetaAnalyticsDataClient({ authClient });
  return cachedClient;
}

export type GaRow = Record<string, string | number | null>;

export function rowsFromResponse(
  response: IRunReportResponse,
): GaRow[] {
  const dimHeaders = (response.dimensionHeaders ?? []).map((h) => h.name ?? "");
  const metricHeaders = (response.metricHeaders ?? []).map((h) => h.name ?? "");
  const rows = response.rows ?? [];

  return rows.map((r) => {
    const out: GaRow = {};
    (r.dimensionValues ?? []).forEach((dv, i) => {
      out[dimHeaders[i] ?? `dim_${i}`] = dv.value ?? null;
    });
    (r.metricValues ?? []).forEach((mv, i) => {
      const name = metricHeaders[i] ?? `metric_${i}`;
      const v = mv.value;
      const num = v == null ? null : Number(v);
      out[name] = num == null || Number.isNaN(num) ? null : num;
    });
    return out;
  });
}
