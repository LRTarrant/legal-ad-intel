// lib/analytics.ts
// Typed GA4 event helpers for LMI.
// GA4 Property: LMI - Production (properties/533553496)
//
// Key events (already created in GA4):
//   demo_request, trial_signup, contact_form, pricing_page_view
//
// User-activity events (this file):
//   identify (sets user_id)
//   tort_viewed, state_viewed
//   campaign_builder_opened, campaign_built
//   ai_query
//   plus trackCustom() for anything else

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

const isProd = process.env.NODE_ENV === "production";
const MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

type GtagEventParams = Record<string, string | number | boolean | undefined>;

function track(eventName: string, params: GtagEventParams = {}) {
  if (typeof window === "undefined") return;
  if (!window.gtag) {
    if (!isProd) console.log("[analytics] gtag not loaded yet:", eventName, params);
    return;
  }
  window.gtag("event", eventName, params);
  if (!isProd) console.log("[analytics] event:", eventName, params);
}

// ---------------------------------------------------------------------------
// User identification
// Call this right after Supabase auth succeeds so GA4 knows who the user is.
// The user_id follows them across devices and sessions once bound.
// ---------------------------------------------------------------------------

type IdentifyParams = {
  userId: string; // Supabase user.id (uuid)
  email?: string; // optional, used only for user_properties
  firmType?: "media" | "agency" | "firm";
  firmName?: string;
  role?: string;
};

export function identify(params: IdentifyParams) {
  if (typeof window === "undefined" || !window.gtag || !MEASUREMENT_ID) return;

  // Bind user_id to the current and all subsequent events.
  window.gtag("config", MEASUREMENT_ID, {
    user_id: params.userId,
  });

  // Attach user properties (visible in GA4 reports as dimensions).
  window.gtag("set", "user_properties", {
    firm_type: params.firmType,
    firm_name: params.firmName,
    role: params.role,
  });

  if (!isProd) console.log("[analytics] identified:", params.userId);
}

export function clearIdentity() {
  if (typeof window === "undefined" || !window.gtag || !MEASUREMENT_ID) return;
  window.gtag("config", MEASUREMENT_ID, { user_id: undefined });
  if (!isProd) console.log("[analytics] identity cleared");
}

// ---------------------------------------------------------------------------
// Key events (primary/secondary conversions)
// ---------------------------------------------------------------------------

export function trackDemoRequest(params?: {
  firm_name?: string;
  firm_type?: "media" | "agency" | "firm";
  source?: string;
}) {
  track("demo_request", { value: 50, currency: "USD", ...params });
}

export function trackTrialSignup(params?: {
  plan?: string;
  firm_type?: "media" | "agency" | "firm";
  source?: string;
}) {
  track("trial_signup", { value: 100, currency: "USD", ...params });
}

export function trackContactForm(params?: { topic?: string; source?: string }) {
  track("contact_form", { value: 25, currency: "USD", ...params });
}

export function trackPricingPageView(params?: { plan_viewed?: string; source?: string }) {
  track("pricing_page_view", { ...params });
}

// ---------------------------------------------------------------------------
// Product usage events (for tracking granted-access users)
// ---------------------------------------------------------------------------

export function trackTortViewed(params: { tort_slug: string; tort_name?: string }) {
  track("tort_viewed", params);
}

export function trackStateViewed(params: { state_code: string; state_name?: string }) {
  track("state_viewed", params);
}

export function trackCampaignBuilderOpened(params?: { tort_slug?: string; state_code?: string }) {
  track("campaign_builder_opened", params ?? {});
}

export function trackCampaignBuilt(params: {
  tort_slug?: string;
  state_code?: string;
  budget_range?: string;
  channels?: string; // comma-separated e.g. "google,meta,tv"
}) {
  track("campaign_built", params);
}

export function trackAiQuery(params: {
  query_text: string;
  context?: string; // e.g. "tort_page", "state_page", "campaign_builder"
}) {
  // Truncate long queries to stay under GA4's 100-char param limit.
  const truncated =
    params.query_text.length > 90 ? params.query_text.slice(0, 87) + "..." : params.query_text;
  track("ai_query", { query_text: truncated, context: params.context });
}

// ---------------------------------------------------------------------------
// Generic escape hatch
// ---------------------------------------------------------------------------

export function trackCustom(name: string, params?: GtagEventParams) {
  track(name, params);
}
