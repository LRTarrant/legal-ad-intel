import { BetaAnalyticsDataClient, protos } from "@google-analytics/data";

type IRunReportResponse = protos.google.analytics.data.v1beta.IRunReportResponse;

let cachedClient: BetaAnalyticsDataClient | null = null;

export function getGa4Config() {
  const propertyId = process.env.GA4_PROPERTY_ID;
  const clientEmail = process.env.GA_CLIENT_EMAIL;
  const rawKey = process.env.GA_PRIVATE_KEY;

  if (!propertyId || !clientEmail || !rawKey) {
    return null;
  }

  // Vercel/dotenv stores newlines as the literal "\n" — restore real newlines.
  const privateKey = rawKey.replace(/\\n/g, "\n");

  return { propertyId, clientEmail, privateKey };
}

export function getGa4Client(): BetaAnalyticsDataClient | null {
  if (cachedClient) return cachedClient;
  const cfg = getGa4Config();
  if (!cfg) return null;

  cachedClient = new BetaAnalyticsDataClient({
    credentials: {
      client_email: cfg.clientEmail,
      private_key: cfg.privateKey,
    },
  });
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
