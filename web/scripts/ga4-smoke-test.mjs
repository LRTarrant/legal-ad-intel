// Throwaway smoke test for the GA4 dashboard credentials.
// Reads the four env vars from web/.env.local (gitignored) and runs ONE
// GA Data API report. Confirms client ID + secret + refresh token + property
// ID + Viewer access all line up before wiring Vercel.
//
//   cd web && node --env-file=.env.local scripts/ga4-smoke-test.mjs
//
// Safe to delete after it prints OK.
import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { UserRefreshClient } from "google-auth-library";

const { GA4_PROPERTY_ID, GA_CLIENT_ID, GA_CLIENT_SECRET, GA_REFRESH_TOKEN } =
  process.env;

const missing = Object.entries({
  GA4_PROPERTY_ID,
  GA_CLIENT_ID,
  GA_CLIENT_SECRET,
  GA_REFRESH_TOKEN,
})
  .filter(([, v]) => !v)
  .map(([k]) => k);

if (missing.length) {
  console.error("❌ Missing env vars:", missing.join(", "));
  console.error("   Add them to web/.env.local and re-run.");
  process.exit(1);
}

const authClient = new UserRefreshClient({
  clientId: GA_CLIENT_ID,
  clientSecret: GA_CLIENT_SECRET,
  refreshToken: GA_REFRESH_TOKEN,
});

// fallback: true mirrors lib/ga4.ts — REST transport (gRPC fails in serverless).
const client = new BetaAnalyticsDataClient({ authClient, fallback: true });

try {
  const [res] = await client.runReport({
    property: `properties/${GA4_PROPERTY_ID}`,
    dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
    metrics: [{ name: "activeUsers" }, { name: "sessions" }, { name: "screenPageViews" }],
  });
  const row = res.rows?.[0]?.metricValues ?? [];
  console.log("✅ GA4 credentials work. Last 30 days:");
  console.log(`   activeUsers:      ${row[0]?.value ?? "0"}`);
  console.log(`   sessions:         ${row[1]?.value ?? "0"}`);
  console.log(`   screenPageViews:  ${row[2]?.value ?? "0"}`);
  console.log("\nSet these same four vars in Vercel (Production + Preview) and you're done.");
} catch (err) {
  console.error("❌ GA Data API call failed:\n");
  console.error(`   ${err.message}\n`);
  if (/PERMISSION_DENIED/i.test(err.message)) {
    console.error("   → The authorized Google account lacks Viewer on this GA4 property,");
    console.error("     OR the GA4_PROPERTY_ID is wrong (must be the numeric property ID,");
    console.error("     not the G-XXXX measurement ID).");
  } else if (/invalid_grant/i.test(err.message)) {
    console.error("   → Refresh token is invalid/expired/revoked. Re-mint via OAuth Playground.");
  } else if (/invalid_client|unauthorized_client/i.test(err.message)) {
    console.error("   → Client ID or secret is wrong (or mismatched pair).");
  }
  process.exit(1);
}
