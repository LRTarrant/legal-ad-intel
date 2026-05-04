"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  MapPin,
  Megaphone,
  Users,
  DollarSign,
  Activity,
  ChevronDown,
  X,
  Sparkles,
  FileText,
  Shield,
  AlertTriangle,
  Lightbulb,
  Search,
  Download,
  Check,
  Globe,
  RefreshCw,
  Clipboard,
  ClipboardCheck,
  Plus,
  ImageIcon,
  Mic,
  Film,
  ChevronUp,
} from "lucide-react";
import { downloadCampaignZip } from "@/lib/campaign-export";
import { trackCampaignBuilderOpened, trackCampaignBuilt } from "@/lib/analytics";
import { BrandAssetsUpload, type BrandAsset } from "./brand-assets-upload";
import { VideoCompositionCard } from "./video-composition-card";
import { PracticeAreaTabs, type PracticeArea } from "./practice-area-tabs";
import { UpgradeModal, type UpgradeModalReason } from "./upgrade-modal";
import {
  isEntitlementError,
  reasonFromEntitlementError,
  type UpgradeMeta,
} from "@/lib/billing/upgrade-copy";
import { PIConfigForm, type PIPlanResult } from "./pi-config-form";
import { PIScriptCard } from "./pi-script-card";
import {
  useSubscription,
  hasMassTortAccess,
  hasPIAccess,
} from "@/lib/campaign-builder/use-subscription";
import {
  getQualificationCriteriaByName,
  type TortQualificationCriteria,
  type ScreeningQuestion,
  type QuestionType,
} from "@/lib/data/tort-qualification-criteria";

/* ── Constants ─────────────────────────────────────────────────────────── */

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN",
  "IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH",
  "NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT",
  "VT","VA","WA","WV","WI","WY",
];

const STATE_NAMES: Record<string, string> = {
  AL:"Alabama",AK:"Alaska",AZ:"Arizona",AR:"Arkansas",CA:"California",
  CO:"Colorado",CT:"Connecticut",DE:"Delaware",DC:"District of Columbia",
  FL:"Florida",GA:"Georgia",HI:"Hawaii",ID:"Idaho",IL:"Illinois",IN:"Indiana",
  IA:"Iowa",KS:"Kansas",KY:"Kentucky",LA:"Louisiana",ME:"Maine",MD:"Maryland",
  MA:"Massachusetts",MI:"Michigan",MN:"Minnesota",MS:"Mississippi",MO:"Missouri",
  MT:"Montana",NE:"Nebraska",NV:"Nevada",NH:"New Hampshire",NJ:"New Jersey",
  NM:"New Mexico",NY:"New York",NC:"North Carolina",ND:"North Dakota",OH:"Ohio",
  OK:"Oklahoma",OR:"Oregon",PA:"Pennsylvania",RI:"Rhode Island",
  SC:"South Carolina",SD:"South Dakota",TN:"Tennessee",TX:"Texas",UT:"Utah",
  VT:"Vermont",VA:"Virginia",WA:"Washington",WV:"West Virginia",WI:"Wisconsin",
  WY:"Wyoming",
};

const PHASE_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  emerging:  { label: "Emerging",  color: "#10B981", bg: "#ECFDF5" },
  buzzy:     { label: "Buzzy",     color: "#F59E0B", bg: "#FFFBEB" },
  mdl_stage: { label: "MDL Stage", color: "#2563EB", bg: "#EFF6FF" },
  late:      { label: "Late",      color: "#EF4444", bg: "#FEF2F2" },
};

const OPPORTUNITY_STYLE: Record<string, { color: string; bg: string }> = {
  high:     { color: "#10B981", bg: "#ECFDF5" },
  moderate: { color: "#F59E0B", bg: "#FFFBEB" },
  low:      { color: "#EF4444", bg: "#FEF2F2" },
};

/* ── Types ──────────────────────────────────────────────────────────────── */

interface CampaignPlan {
  tort_overview: {
    tort_name: string;
    lifecycle_phase: string;
    cpl_range: { low: number | null; high: number | null };
    cpa_range: { low: number | null; high: number | null };
    cpk_range: { low: number | null; high: number | null };
    lead_to_retainer_pct: number | null;
    latest_mdl: { title: string; date: string; summary: string | null } | null;
    trend_direction: "up" | "down" | "flat";
  };
  geo_recommendations: {
    state: string;
    population: number;
    incidence: number;
    saturation_score: number;
    opportunity_score: number;
    opportunity_level: "high" | "moderate" | "low";
  }[];
  relevant_dmas: { name: string; population: number }[];
  channel_mix: {
    primary: {
      channel: string;
      role: string;
      cost_pressure: string;
      competition_score: number | null;
      allocation_pct: number;
      recommendation: string;
    }[];
    secondary: {
      channel: string;
      role: string;
      cost_pressure: string;
      competition_score: number | null;
      allocation_pct: number;
      recommendation: string;
    }[];
    situational: {
      channel: string;
      role: string;
      cost_pressure: string;
      allocation_pct: number;
    }[];
    lifecycle_note: string;
  };
  audience_targeting: {
    age_bands: Record<string, number> | null;
    meta_targeting: {
      age_ranges: string[];
      interests: string[];
      demographics: string;
    };
    google_targeting: {
      keyword_themes: string[];
      audience_segments: string[];
    };
    state_specific_notes: string;
  };
  budget_projection: {
    monthly_budget: number;
    avg_cpl: number;
    expected_leads_per_month: number;
    lead_to_retainer_pct: number;
    expected_retainers_per_month: number;
    cost_per_kept_case: number | null;
    channel_split: {
      core: { label: string; amount: number; pct: number };
      secondary: { label: string; amount: number; pct: number };
      situational: { label: string; amount: number; pct: number };
    };
  } | null;
}

interface AiInsights {
  strategic_brief: string;
  market_context: string;
  ad_copy: {
    meta: {
      headlines: string[];
      body_options: string[];
      ctas: string[];
    };
    google_search: {
      headlines: string[];
      descriptions: string[];
    };
  };
  compliance_notes: string[];
  risk_factors: string[];
  opportunities: string[];
  competitive_insights: string;
  historical_playbook: string;
}

/* ── Custom Question & Brand Types ──────────────────────────────────────── */

interface CustomQuestion {
  id: string;
  question: string;
  type: QuestionType;
  options?: string[];
}

interface BrandColors {
  primary: string | null;
  secondary: string | null;
  accent: string | null;
}

interface RecommendedMarket {
  state: string;
  state_name: string;
  score: number;
  signals: string[];
  primary_signal: string;
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function fmtCurrency(val: number | null): string {
  if (val == null) return "\u2014";
  return `$${val.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function fmtRange(low: number | null, high: number | null): string {
  if (low == null && high == null) return "\u2014";
  if (low != null && high != null && low === high) return fmtCurrency(low);
  return `${fmtCurrency(low)} \u2013 ${fmtCurrency(high)}`;
}

function fmtNumber(val: number): string {
  return val.toLocaleString("en-US");
}

function fmtPct(val: number | null): string {
  if (val == null) return "\u2014";
  return `${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}%`;
}

function channelLabel(ch: string): string {
  return ch
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace("Ctv ", "CTV ")
    .replace("Tv ", "TV ");
}

/* ── Component ──────────────────────────────────────────────────────────── */

export function CampaignBuilderClient() {
  const tenant = useTenant();
  const accentColor = tenant.accentColor ?? "#1A8C96";

  // ── Practice area tab state ───────────────────────────────────────────
  const subscriptionResult = useSubscription();
  const subscription = subscriptionResult.subscription;
  const subscriptionLoading = subscriptionResult.loading;

  // Active practice area tab. Default to mass_tort to match existing
  // behavior; URL param + localStorage override are applied below.
  const [practiceArea, setPracticeArea] = useState<PracticeArea>("mass_tort");
  const [upgradeModal, setUpgradeModal] = useState<{
    open: boolean;
    reason: UpgradeModalReason;
    meta?: UpgradeMeta;
  }>({ open: false, reason: "pi_locked" });

  // Deep link payload from tort/state pages. Captured on first mount
  // before URL params are stripped, then handed to downstream forms
  // (mass tort → selectedTort, PI → PIConfigForm initial values).
  const [deepLink, setDeepLink] = useState<{
    tortName?: string;
    piCategory?: string;
    state?: string;
  }>({});
  // True when the practice_area was set from a URL param (vs. user click /
  // localStorage). Used to auto-open the upgrade modal if the deep-linked
  // practice area is locked for this subscription — so deep links never
  // silently fail.
  const [practiceAreaFromDeepLink, setPracticeAreaFromDeepLink] = useState(false);
  const [deepLinkUpgradeChecked, setDeepLinkUpgradeChecked] = useState(false);

  // Hydrate practice_area + deep-link payload from URL on first mount.
  // Deep links from tort detail pages bring `tort_name`; deep links from
  // state intelligence pages bring `state` (and optionally `pi_category`).
  // URL takes precedence over localStorage. All recognized params are
  // stripped after capture so the URL stays clean for sharing/bookmarks.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const fromUrl = url.searchParams.get("practice_area");
    const tortNameParam = url.searchParams.get("tort_name");
    const piCategoryParam = url.searchParams.get("pi_category");
    const stateParam = url.searchParams.get("state");

    let dirty = false;
    if (fromUrl === "mass_tort" || fromUrl === "personal_injury") {
      setPracticeArea(fromUrl);
      setPracticeAreaFromDeepLink(true);
      url.searchParams.delete("practice_area");
      dirty = true;
    } else {
      const fromStorage = window.localStorage.getItem("campaignBuilder.practiceArea");
      if (fromStorage === "mass_tort" || fromStorage === "personal_injury") {
        setPracticeArea(fromStorage);
      }
    }

    const next: { tortName?: string; piCategory?: string; state?: string } = {};
    if (tortNameParam) {
      next.tortName = tortNameParam;
      url.searchParams.delete("tort_name");
      dirty = true;
    }
    if (piCategoryParam) {
      next.piCategory = piCategoryParam;
      url.searchParams.delete("pi_category");
      dirty = true;
    }
    if (stateParam) {
      next.state = stateParam.toUpperCase();
      url.searchParams.delete("state");
      dirty = true;
    }
    if (next.tortName || next.piCategory || next.state) {
      setDeepLink(next);
    }
    if (dirty) {
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  // Persist tab choice for next visit
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("campaignBuilder.practiceArea", practiceArea);
    }
  }, [practiceArea]);

  // If the user landed here via a deep link to a practice area they don't
  // have entitlement for, surface the upgrade modal immediately rather
  // than letting them sit on a locked-looking tab. Runs once after
  // subscription loads.
  useEffect(() => {
    if (!practiceAreaFromDeepLink || subscriptionLoading || deepLinkUpgradeChecked) {
      return;
    }
    const hasMT = hasMassTortAccess(subscription);
    const hasPI = hasPIAccess(subscription);
    setDeepLinkUpgradeChecked(true);
    if (practiceArea === "personal_injury" && !hasPI) {
      setUpgradeModal({
        open: true,
        reason: !hasMT && !hasPI ? "no_access" : "pi_locked",
      });
    } else if (practiceArea === "mass_tort" && !hasMT) {
      setUpgradeModal({
        open: true,
        reason: !hasMT && !hasPI ? "no_access" : "mt_locked",
      });
    }
  }, [
    practiceAreaFromDeepLink,
    subscriptionLoading,
    deepLinkUpgradeChecked,
    practiceArea,
    subscription,
  ]);

  const handleLockedTabClick = (locked: PracticeArea) => {
    // Reason: which tab is locked relative to what they have access to
    const hasMT = hasMassTortAccess(subscription);
    const hasPI = hasPIAccess(subscription);
    let reason: UpgradeModalReason;
    if (!hasMT && !hasPI) {
      reason = "no_access";
    } else if (locked === "personal_injury") {
      reason = "pi_locked";
    } else {
      reason = "mt_locked";
    }
    setUpgradeModal({ open: true, reason });
  };

  // PI generation result (separate from mass tort plan state)
  const [piResult, setPiResult] = useState<PIPlanResult | null>(null);

  // Form state
  const [tortNames, setTortNames] = useState<string[]>([]);
  const [selectedTort, setSelectedTort] = useState("");
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [monthlyBudget, setMonthlyBudget] = useState("");
  const [firmName, setFirmName] = useState("");
  const [stateDropdownOpen, setStateDropdownOpen] = useState(false);
  const [stateSearch, setStateSearch] = useState("");
  const [brandAssets, setBrandAssets] = useState<BrandAsset[]>([]);
  const [tortPageData, setTortPageData] = useState<{ url: string; title: string; headings: string[]; snippet: string }[]>([]);
  const [language, setLanguage] = useState<"en" | "es">("en");

  // Recommended markets
  const [recommendedMarkets, setRecommendedMarkets] = useState<RecommendedMarket[]>([]);
  const [marketsLoading, setMarketsLoading] = useState(false);

  // Results
  const [plan, setPlan] = useState<CampaignPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AI Insights
  const [aiInsights, setAiInsights] = useState<AiInsights | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(false);

  // Export state
  const [exporting, setExporting] = useState(false);
  const [exportDone, setExportDone] = useState(false);

  // Landing page state
  const [hasLandingPage, setHasLandingPage] = useState<boolean | null>(null);
  const [wantsLandingPage, setWantsLandingPage] = useState<boolean | null>(null);
  const [landingPageHtml, setLandingPageHtml] = useState<string | null>(null);
  const [landingPageTitle, setLandingPageTitle] = useState<string | null>(null);
  const [landingPages, setLandingPages] = useState<{ slug: string; html: string; title: string }[] | null>(null);
  const [landingPagesTitle, setLandingPagesTitle] = useState<string | null>(null);
  const [activePageTab, setActivePageTab] = useState<string>("landing");
  const [landingPageLoading, setLandingPageLoading] = useState(false);
  const [landingPageError, setLandingPageError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Qualification flow state
  const [qualificationStyle, setQualificationStyle] = useState<"multi-step" | "single-page" | null>(null);
  const [activeFormPageTab, setActiveFormPageTab] = useState(0);

  // Feature 1: Selectable + custom criteria questions
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());
  const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>([]);

  // Feature 2: Brand scraping
  const [brandColors, setBrandColors] = useState<BrandColors>({ primary: null, secondary: null, accent: null });

  // Feature 3: AI creative images
  const [aiCreativeEnabled, setAiCreativeEnabled] = useState(false);
  const [creativeImages, setCreativeImages] = useState<(string | null)[]>([null, null, null]);
  const [creativeLoading, setCreativeLoading] = useState<boolean[]>([false, false, false]);

  // Feature 4: AI Radio / Podcast Spot
  const [radioSpotAvailable, setRadioSpotAvailable] = useState<boolean | null>(null);
  const [radioExpanded, setRadioExpanded] = useState(false);
  const [radioFormat, setRadioFormat] = useState<"radio" | "podcast">("radio");
  const [radioDuration, setRadioDuration] = useState<"15s" | "30s" | "60s">("30s");
  const [radioScript, setRadioScript] = useState("");
  const [radioScriptLoading, setRadioScriptLoading] = useState(false);
  const [radioScriptGenerated, setRadioScriptGenerated] = useState(false);
  const [radioVoices, setRadioVoices] = useState<{ id: string; name: string; description: string; category: string; previewUrl: string }[]>([]);
  const [radioVoicesLoading, setRadioVoicesLoading] = useState(false);
  const [radioSelectedVoice, setRadioSelectedVoice] = useState("");
  const [radioGenerating, setRadioGenerating] = useState(false);
  const [radioAudioUrl, setRadioAudioUrl] = useState<string | null>(null);
  const [radioError, setRadioError] = useState<string | null>(null);
  const [radioCooldown, setRadioCooldown] = useState(false);
  const [voiceRecommendation, setVoiceRecommendation] = useState<{ gender: string; style: string; reason: string } | null>(null);
  const [audienceContext, setAudienceContext] = useState<{ primary_age_bands: string; audience_note: string } | null>(null);

  // Feature 5: AI Video Composition
  const [videoExpanded, setVideoExpanded] = useState(false);

  // Derive matched criteria from selected tort name
  const matchedCriteria: TortQualificationCriteria | undefined = useMemo(
    () => (selectedTort ? getQualificationCriteriaByName(selectedTort) : undefined),
    [selectedTort],
  );

  // Initialize selected question IDs when matched criteria changes
  useEffect(() => {
    if (matchedCriteria) {
      setSelectedQuestionIds(new Set(matchedCriteria.screeningQuestions.map((q) => q.id)));
    } else {
      setSelectedQuestionIds(new Set());
    }
    setCustomQuestions([]);
  }, [matchedCriteria]);

  // Fetch tort names on mount
  useEffect(() => {
    async function fetchTorts() {
      const supabase = createClient();
      const { data } = await (supabase as any)
        .from("tort_cost_benchmarks")
        .select("tort_name");
      if (data) {
        const unique = [...new Set((data as Record<string, unknown>[]).map((d) => d.tort_name as string))].sort();
        setTortNames(unique);
      }
    }
    fetchTorts();
  }, []);

  // Once tort names load, apply deep-linked tort_name if it matches.
  // We do a tolerant case-insensitive match — the URL param may come
  // from `tort.label` which can differ in punctuation/case from the
  // `tort_cost_benchmarks.tort_name` list. If no match, we silently
  // leave the dropdown unselected (graceful degradation).
  useEffect(() => {
    if (!deepLink.tortName || tortNames.length === 0 || selectedTort) return;
    const target = deepLink.tortName.toLowerCase().trim();
    const exact = tortNames.find((n) => n.toLowerCase() === target);
    const fuzzy =
      exact ??
      tortNames.find(
        (n) =>
          n.toLowerCase().includes(target) || target.includes(n.toLowerCase()),
      );
    if (fuzzy) setSelectedTort(fuzzy);
  }, [deepLink.tortName, tortNames, selectedTort]);

  // Fetch recommended markets when tort changes
  useEffect(() => {
    if (!selectedTort) {
      setRecommendedMarkets([]);
      return;
    }
    setMarketsLoading(true);
    fetch("/api/campaigns/recommended-markets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tort_name: selectedTort }),
    })
      .then((res) => res.json())
      .then((data) => setRecommendedMarkets(data.recommended_markets ?? []))
      .catch(() => setRecommendedMarkets([]))
      .finally(() => setMarketsLoading(false));
  }, [selectedTort]);

  // Check ElevenLabs availability on mount
  useEffect(() => {
    fetch("/api/campaigns/voices/check")
      .then((res) => res.json())
      .then((data: { available: boolean }) => setRadioSpotAvailable(data.available))
      .catch(() => setRadioSpotAvailable(false));
  }, []);

  // GA4: track campaign builder opened
  useEffect(() => {
    trackCampaignBuilderOpened();
  }, []);

  const filteredStates = useMemo(() => {
    if (!stateSearch) return US_STATES;
    const q = stateSearch.toLowerCase();
    return US_STATES.filter(
      (s) =>
        s.toLowerCase().includes(q) ||
        STATE_NAMES[s]?.toLowerCase().includes(q),
    );
  }, [stateSearch]);

  // Trigger AI insights when plan data arrives
  useEffect(() => {
    if (!plan) return;

    let cancelled = false;
    setAiLoading(true);
    setAiError(false);
    setAiInsights(null);

    fetch("/api/campaigns/ai-insights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tort_name: selectedTort,
        states: selectedStates,
        monthly_budget: monthlyBudget ? Number(monthlyBudget) : undefined,
        firm_name: firmName.trim() || undefined,
        language: language !== "en" ? language : undefined,
        plan_data: {
          tort_overview: plan.tort_overview,
          geo_recommendations: plan.geo_recommendations,
          channel_mix: plan.channel_mix,
          budget_projection: plan.budget_projection,
        },
        brand_asset_urls: brandAssets.length > 0 ? brandAssets.map((a) => a.url) : undefined,
        tort_pages: tortPageData.length > 0 ? tortPageData : undefined,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("AI request failed");
        return res.json();
      })
      .then((data: AiInsights) => {
        if (!cancelled) setAiInsights(data);
      })
      .catch(() => {
        if (!cancelled) setAiError(true);
      })
      .finally(() => {
        if (!cancelled) setAiLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan]);

  function toggleState(state: string) {
    setSelectedStates((prev) =>
      prev.includes(state) ? prev.filter((s) => s !== state) : [...prev, state],
    );
  }

  // Feature 1: Question selection helpers
  function toggleQuestion(id: string) {
    setSelectedQuestionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function addCustomQuestion() {
    const id = `custom-${crypto.randomUUID()}`;
    setCustomQuestions((prev) => [
      ...prev,
      { id, question: "", type: "yes_no" as QuestionType },
    ]);
    setSelectedQuestionIds((prev) => new Set([...prev, id]));
  }

  function updateCustomQuestion(id: string, updates: Partial<CustomQuestion>) {
    setCustomQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, ...updates } : q)),
    );
  }

  function removeCustomQuestion(id: string) {
    setCustomQuestions((prev) => prev.filter((q) => q.id !== id));
    setSelectedQuestionIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  // Build the final selected screening questions for landing page generation
  const selectedScreeningQuestions: ScreeningQuestion[] = useMemo(() => {
    const standard = (matchedCriteria?.screeningQuestions ?? []).filter(
      (q) => selectedQuestionIds.has(q.id),
    );
    const custom: ScreeningQuestion[] = customQuestions
      .filter((q) => selectedQuestionIds.has(q.id) && q.question.trim())
      .map((q) => ({
        id: q.id,
        question: q.question,
        type: q.type,
        options: q.options,
      }));
    return [...standard, ...custom];
  }, [matchedCriteria, selectedQuestionIds, customQuestions]);

  const totalSelectedQuestions = selectedScreeningQuestions.length;

  // Distribute selected questions across form pages (1-2 per page + CTA page) for multi-step
  const formPages = useMemo(() => {
    if (qualificationStyle !== "multi-step" || selectedScreeningQuestions.length === 0) return [];
    const pages: { label: string; questions: ScreeningQuestion[] }[] = [];
    const qs = selectedScreeningQuestions;
    // Distribute: 2 questions per page, except if odd total then last content page gets 1
    let idx = 0;
    let pageNum = 1;
    while (idx < qs.length) {
      const remaining = qs.length - idx;
      const take = remaining > 3 ? 2 : remaining > 2 ? 2 : remaining;
      pages.push({
        label: `Page ${pageNum}`,
        questions: qs.slice(idx, idx + take),
      });
      idx += take;
      pageNum++;
    }
    // Add final CTA/submit page
    pages.push({ label: "Submit", questions: [] });
    return pages;
  }, [qualificationStyle, selectedScreeningQuestions]);

  // Reset active form page tab when pages change
  useEffect(() => {
    if (activeFormPageTab >= formPages.length) {
      setActiveFormPageTab(0);
    }
  }, [formPages.length, activeFormPageTab]);

  // Feature 3: AI creative image generation
  async function generateCreativeImage(variantIndex: number) {
    if (!aiInsights || !plan) return;
    setCreativeLoading((prev) => {
      const next = [...prev];
      next[variantIndex] = true;
      return next;
    });

    try {
      const res = await fetch("/api/campaigns/generate-creative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tortName: selectedTort,
          firmName: firmName.trim() || undefined,
          audienceDemo: plan.audience_targeting?.meta_targeting.demographics,
          messaging: aiInsights.ad_copy.meta.headlines[variantIndex] ?? aiInsights.strategic_brief,
          brandColors: {
            primary: brandColors.primary,
            secondary: brandColors.secondary,
            accent: brandColors.accent,
          },
          brandAssetUrls: brandAssets.length > 0 ? brandAssets.map((a) => a.url) : undefined,
        }),
      });

      if (!res.ok) throw new Error("Generation failed");
      const data = await res.json();
      setCreativeImages((prev) => {
        const next = [...prev];
        next[variantIndex] = data.imageUrl;
        return next;
      });
    } catch {
      // Keep null — gradient fallback will show
    } finally {
      setCreativeLoading((prev) => {
        const next = [...prev];
        next[variantIndex] = false;
        return next;
      });
    }
  }

  async function generateAllCreativeImages() {
    if (!aiInsights || !plan) return;
    const results = await Promise.allSettled(
      [0, 1, 2].map((i) => generateCreativeImage(i)),
    );
    // Results handled by individual calls
  }

  // Feature 4: Radio spot functions
  async function fetchRadioVoices() {
    if (radioVoices.length > 0) return;
    setRadioVoicesLoading(true);
    try {
      const res = await fetch("/api/campaigns/voices");
      if (!res.ok) throw new Error("Failed to fetch voices");
      const data = await res.json();
      setRadioVoices(data.voices);
      // Default to a strong male voice if available
      const defaultVoice = data.voices.find(
        (v: { name: string; description: string }) =>
          v.name.toLowerCase().includes("adam") ||
          v.description.toLowerCase().includes("deep"),
      );
      if (defaultVoice && !radioSelectedVoice) {
        setRadioSelectedVoice(defaultVoice.id);
      } else if (data.voices.length > 0 && !radioSelectedVoice) {
        setRadioSelectedVoice(data.voices[0].id);
      }
    } catch {
      // Voices will remain empty — user can retry
    } finally {
      setRadioVoicesLoading(false);
    }
  }

  async function generateRadioScript(duration: "15s" | "30s" | "60s", format: "radio" | "podcast" = "radio") {
    if (!plan || !selectedTort) return;
    setRadioScriptLoading(true);
    setRadioError(null);
    try {
      const res = await fetch("/api/campaigns/generate-radio-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          duration,
          format,
          tort_name: selectedTort,
          firm_name: firmName.trim() || undefined,
          states: selectedStates.length > 0 ? selectedStates : undefined,
          language: language !== "en" ? language : undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (isEntitlementError(body)) {
          const mapped = reasonFromEntitlementError(body, "mass_tort");
          setUpgradeModal({ open: true, reason: mapped.reason, meta: mapped.meta });
          setRadioError(body.error ?? "Upgrade required");
          setRadioScriptLoading(false);
          return;
        }
        throw new Error(body.error ?? "Script generation failed");
      }
      const data = await res.json();
      if (data.script) {
        setRadioScript(data.script);
        setRadioScriptGenerated(true);
      }
      if (data.voice_recommendation) {
        setVoiceRecommendation(data.voice_recommendation);
        // Auto-select a matching voice from the loaded voices
        if (radioVoices.length > 0) {
          const recGender = (data.voice_recommendation.gender ?? "").toLowerCase();
          const match = radioVoices.find(
            (v) =>
              v.name.toLowerCase().includes(recGender) ||
              v.description.toLowerCase().includes(recGender),
          );
          if (match) {
            setRadioSelectedVoice(match.id);
          }
        }
      } else {
        setVoiceRecommendation(null);
      }
      setAudienceContext(data.audience_context ?? null);
    } catch {
      setRadioError("Failed to generate script. You can write your own below.");
    } finally {
      setRadioScriptLoading(false);
    }
  }

  async function generateRadioSpot() {
    if (!radioScript.trim() || !radioSelectedVoice) return;
    setRadioGenerating(true);
    setRadioError(null);
    setRadioCooldown(true);

    try {
      const res = await fetch("/api/campaigns/generate-radio-spot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          script: radioScript,
          voiceId: radioSelectedVoice,
          duration: radioDuration,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error ?? "Generation failed");
      }
      const data = await res.json();
      setRadioAudioUrl(data.audioUrl);
    } catch (err) {
      setRadioError(err instanceof Error ? err.message : "Audio generation failed. Please try again.");
    } finally {
      setRadioGenerating(false);
      // 3-second cooldown
      setTimeout(() => setRadioCooldown(false), 3000);
    }
  }

  function handleRadioExpand() {
    if (!radioExpanded) {
      setRadioExpanded(true);
      // Fetch voices and generate script on first expand
      fetchRadioVoices();
      if (!radioScriptGenerated && !radioScript) {
        generateRadioScript(radioDuration, radioFormat);
      }
    } else {
      setRadioExpanded(false);
    }
  }

  async function generatePlan() {
    if (!selectedTort || selectedStates.length === 0) return;
    setLoading(true);
    setError(null);
    setPlan(null);
    setAiInsights(null);
    setAiError(false);
    setAiLoading(false);
    setHasLandingPage(null);
    setWantsLandingPage(null);
    setLandingPageHtml(null);
    setLandingPageTitle(null);
    setLandingPageError(null);
    setQualificationStyle(null);
    setAiCreativeEnabled(false);
    setCreativeImages([null, null, null]);
    setCreativeLoading([false, false, false]);
    setRadioExpanded(false);
    setRadioScript("");
    setRadioScriptGenerated(false);
    setRadioAudioUrl(null);
    setRadioError(null);
    setVideoExpanded(false);

    try {
      const res = await fetch("/api/campaigns/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tort_name: selectedTort,
          states: selectedStates,
          monthly_budget: monthlyBudget ? Number(monthlyBudget) : undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        // Entitlement denial → open upgrade modal with mass-tort context
        if (isEntitlementError(body)) {
          const mapped = reasonFromEntitlementError(body, "mass_tort");
          setUpgradeModal({ open: true, reason: mapped.reason, meta: mapped.meta });
          setError(body.error ?? "Upgrade required");
          setLoading(false);
          return;
        }
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }

      const data: CampaignPlan = await res.json();
      setPlan(data);
      trackCampaignBuilt({
        tort_slug: selectedTort,
        state_code: selectedStates.join(","),
        budget_range: monthlyBudget || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate plan");
    } finally {
      setLoading(false);
    }
  }

  async function generateLandingPage() {
    if (!plan) return;
    setLandingPageLoading(true);
    setLandingPageError(null);
    setLandingPageHtml(null);
    setLandingPageTitle(null);
    setLandingPages(null);
    setLandingPagesTitle(null);
    setActivePageTab("landing");

    try {
      const res = await fetch("/api/campaigns/generate-landing-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tort_name: selectedTort,
          states: selectedStates,
          firm_name: firmName.trim() || undefined,
          language: language !== "en" ? language : undefined,
          messaging: aiInsights
            ? {
                strategic_brief: aiInsights.strategic_brief,
                headlines: aiInsights.ad_copy.meta.headlines,
                body_options: aiInsights.ad_copy.meta.body_options,
                ctas: aiInsights.ad_copy.meta.ctas,
              }
            : undefined,
          audience: plan.audience_targeting
            ? {
                age_ranges: plan.audience_targeting.meta_targeting.age_ranges,
                demographics: plan.audience_targeting.meta_targeting.demographics,
              }
            : undefined,
          budget_info: plan.budget_projection
            ? {
                monthly_budget: plan.budget_projection.monthly_budget,
                avg_cpl: plan.budget_projection.avg_cpl,
              }
            : undefined,
          logo_url: brandAssets.find((a) => a.name.toLowerCase().includes("logo"))?.url ?? undefined,
          qualification_style: qualificationStyle ?? undefined,
          screening_questions: selectedScreeningQuestions.length > 0 ? selectedScreeningQuestions : undefined,
          form_pages: formPages.length > 0 ? formPages.map((p) => ({ label: p.label, questionIds: p.questions.map((q) => q.id) })) : undefined,
          disqualify_message: matchedCriteria?.disqualifyMessage ?? undefined,
          qualify_message: matchedCriteria?.qualifyMessage ?? undefined,
          brand_colors: (brandColors.primary || brandColors.secondary || brandColors.accent) ? brandColors : undefined,
          brand_asset_urls: brandAssets.length > 0 ? brandAssets.map((a) => a.url) : undefined,
          tort_pages: tortPageData.length > 0 ? tortPageData : undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }

      const data = await res.json();

      if (data.pages) {
        // Multi-page response
        setLandingPages(data.pages);
        setLandingPagesTitle(data.title);
      } else {
        // Single-page response (backward compatible)
        setLandingPageHtml(data.html);
        setLandingPageTitle(data.title);
      }
    } catch (err) {
      setLandingPageError(
        err instanceof Error ? err.message : "Failed to generate landing page",
      );
    } finally {
      setLandingPageLoading(false);
    }
  }

  function downloadHtmlFile(html: string, title: string) {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/[^a-zA-Z0-9-_ ]/g, "").replace(/\s+/g, "-").toLowerCase() || "landing-page"}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function downloadLandingPage() {
    if (landingPages) {
      // Download all pages
      for (const page of landingPages) {
        downloadHtmlFile(page.html, page.title);
      }
    } else if (landingPageHtml) {
      downloadHtmlFile(landingPageHtml, landingPageTitle ?? "landing-page");
    }
  }

  function downloadCurrentPage() {
    if (landingPages) {
      const current = landingPages.find((p) => p.slug === activePageTab);
      if (current) downloadHtmlFile(current.html, current.title);
    } else if (landingPageHtml) {
      downloadHtmlFile(landingPageHtml, landingPageTitle ?? "landing-page");
    }
  }

  async function copyLandingPageHtml() {
    const html = landingPages
      ? landingPages.find((p) => p.slug === activePageTab)?.html
      : landingPageHtml;
    if (!html) return;
    await navigator.clipboard.writeText(html);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const canGenerate = selectedTort && selectedStates.length > 0 && firmName.trim() !== "" && !loading;
  const canExport = plan && aiInsights && !exporting;

  async function handleExport() {
    if (!plan || !aiInsights) return;
    setExporting(true);
    setExportDone(false);
    try {
      await downloadCampaignZip(plan, aiInsights);
      setExportDone(true);
      setTimeout(() => setExportDone(false), 3000);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Practice area tabs */}
      <PracticeAreaTabs
        active={practiceArea}
        onChange={setPracticeArea}
        onLockedClick={handleLockedTabClick}
        subscription={subscription}
        loading={subscriptionLoading}
        accentColor={accentColor}
      />

      <UpgradeModal
        open={upgradeModal.open}
        reason={upgradeModal.reason}
        subscription={subscription}
        meta={upgradeModal.meta}
        onClose={() => setUpgradeModal((s) => ({ ...s, open: false }))}
        accentColor={accentColor}
      />

      {/* Input Panel */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="font-heading text-lg font-semibold text-midnight-navy mb-4">
          {practiceArea === "mass_tort"
            ? "Configure Your Campaign"
            : "Configure Your PI Campaign"}
        </h2>
        {practiceArea === "personal_injury" && (
          <PIConfigForm
            firmName={firmName}
            onFirmNameChange={setFirmName}
            onGenerated={setPiResult}
            accentColor={accentColor}
            initialState={deepLink.state}
            initialCategory={deepLink.piCategory}
            onEntitlementError={({ reason, meta }) =>
              setUpgradeModal({ open: true, reason, meta })
            }
          />
        )}
        {practiceArea === "mass_tort" && (
        <>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Firm/Company Name */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1.5">
              Firm / Company Name <span className="text-alert">*</span>
            </label>
            <input
              type="text"
              value={firmName}
              onChange={(e) => setFirmName(e.target.value)}
              placeholder="e.g., Smith & Associates"
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm text-midnight-navy focus:border-intelligence-teal focus:outline-none focus:ring-1 focus:ring-intelligence-teal"
            />
          </div>

          {/* Tort Dropdown */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1.5">
              Tort <span className="text-alert">*</span>
            </label>
            <select
              value={selectedTort}
              onChange={(e) => setSelectedTort(e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm text-midnight-navy focus:border-intelligence-teal focus:outline-none focus:ring-1 focus:ring-intelligence-teal"
            >
              <option value="">Select a tort...</option>
              {tortNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Recommended Markets */}
          {(marketsLoading || recommendedMarkets.length > 0) && (
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-gray mb-1">
                Recommended Markets
              </label>
              {marketsLoading ? (
                <div className="flex items-center gap-2 py-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-intelligence-teal" />
                  <span className="text-xs text-intelligence-teal font-medium">Analyzing markets...</span>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {recommendedMarkets.map((m) => {
                    const isSelected = selectedStates.includes(m.state);
                    return (
                      <button
                        key={m.state}
                        type="button"
                        onClick={() => toggleState(m.state)}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full border text-sm cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-intelligence-teal/20 border-intelligence-teal"
                            : "border-intelligence-teal/30 bg-intelligence-teal/5 hover:bg-intelligence-teal/15"
                        }`}
                      >
                        <span className="font-semibold text-midnight-navy">{m.state}</span>
                        <span className="text-[10px] uppercase tracking-wider text-slate-gray ml-1">
                          {m.primary_signal}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* State Multi-select */}
          <div className="relative">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1.5">
              Target States
            </label>
            <button
              type="button"
              onClick={() => setStateDropdownOpen(!stateDropdownOpen)}
              className="flex w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm text-left focus:border-intelligence-teal focus:outline-none focus:ring-1 focus:ring-intelligence-teal"
            >
              <span className={selectedStates.length > 0 ? "text-midnight-navy" : "text-slate-gray"}>
                {selectedStates.length > 0
                  ? `${selectedStates.length} state${selectedStates.length > 1 ? "s" : ""} selected`
                  : "Select states..."}
              </span>
              <ChevronDown className="h-4 w-4 text-slate-gray" />
            </button>

            {stateDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setStateDropdownOpen(false)}
                />
                <div className="absolute left-0 top-full z-20 mt-1 w-full max-h-64 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
                  <div className="sticky top-0 bg-white border-b border-slate-100 p-2">
                    <input
                      type="text"
                      value={stateSearch}
                      onChange={(e) => setStateSearch(e.target.value)}
                      placeholder="Search states..."
                      className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm focus:border-intelligence-teal focus:outline-none"
                      autoFocus
                    />
                  </div>
                  {filteredStates.map((state) => (
                    <button
                      key={state}
                      type="button"
                      onClick={() => toggleState(state)}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-cloud/60 transition-colors ${
                        selectedStates.includes(state) ? "bg-intelligence-teal/5 text-intelligence-teal font-medium" : "text-midnight-navy"
                      }`}
                    >
                      <span
                        className={`flex h-4 w-4 items-center justify-center rounded border text-xs ${
                          selectedStates.includes(state)
                            ? "border-intelligence-teal bg-intelligence-teal text-white"
                            : "border-slate-300"
                        }`}
                      >
                        {selectedStates.includes(state) && "\u2713"}
                      </span>
                      {state} — {STATE_NAMES[state]}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Selected state pills */}
            {selectedStates.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {selectedStates.map((state) => (
                  <span
                    key={state}
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
                  >
                    {state}
                    <button
                      type="button"
                      onClick={() => toggleState(state)}
                      className="hover:opacity-70"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Monthly Budget */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1.5">
              Monthly Budget (optional)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-gray">
                $
              </span>
              <input
                type="number"
                value={monthlyBudget}
                onChange={(e) => setMonthlyBudget(e.target.value)}
                placeholder="50,000"
                min="0"
                className="w-full rounded-md border border-slate-200 bg-white pl-7 pr-3 py-2.5 text-sm text-midnight-navy focus:border-intelligence-teal focus:outline-none focus:ring-1 focus:ring-intelligence-teal"
              />
            </div>
          </div>

          {/* Generate Button */}
          <div className="flex items-end">
            <button
              onClick={generatePlan}
              disabled={!canGenerate}
              className={`w-full rounded-md px-4 py-2.5 text-sm font-semibold text-white transition-colors ${
                canGenerate ? "" : "bg-slate-300 cursor-not-allowed"
              }`}
              style={canGenerate ? { backgroundColor: accentColor } : undefined}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </span>
              ) : (
                "Generate Campaign Plan"
              )}
            </button>
          </div>
        </div>

        {/* Brand Assets Upload */}
        <div className="mt-4 border-t border-slate-100 pt-4">
          <BrandAssetsUpload assets={brandAssets} onAssetsChange={setBrandAssets} accentColor={accentColor} />

          {/* Tort page indicator */}
          {tortPageData.length > 0 && (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-intelligence-teal">
              <Globe className="h-3.5 w-3.5 shrink-0" />
              Found {tortPageData.length} existing {selectedTort} page{tortPageData.length !== 1 ? "s" : ""} on firm website
            </div>
          )}

          {/* Language toggle */}
          <div className="mt-3 flex items-center gap-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Creative Language
            </label>
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5">
              {([{ value: "en", label: "English" }, { value: "es", label: "Español" }] as const).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setLanguage(opt.value)}
                  className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                    language === opt.value
                      ? "bg-intelligence-teal text-white"
                      : "text-slate-gray hover:text-midnight-navy"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        </>
        )}
      </div>

      {/* PI script result */}
      {practiceArea === "personal_injury" && piResult && (
        <PIScriptCard result={piResult} accentColor={accentColor} />
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-alert/20 bg-alert/5 p-4 text-sm text-alert">
          {error}
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && (
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={`rounded-lg bg-white p-6 shadow-sm ${i === 2 || i === 5 ? "md:col-span-2" : ""}`}
            >
              <div className="animate-pulse space-y-3">
                <div className="h-5 w-1/3 rounded bg-slate-200" />
                <div className="h-4 w-full rounded bg-slate-100" />
                <div className="h-4 w-2/3 rounded bg-slate-100" />
                <div className="h-4 w-1/2 rounded bg-slate-100" />
                <div className="h-20 w-full rounded bg-slate-50" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {plan && !loading && (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Card 1: Tort Intelligence */}
            <TortIntelligenceCard overview={plan.tort_overview} accentColor={accentColor} />

            {/* Card 2: Geographic Targeting — full width */}
            <div className="md:col-span-2">
              <GeoTargetingCard
                geoRecs={plan.geo_recommendations}
                dmas={plan.relevant_dmas}
                accentColor={accentColor}
              />
            </div>

            {/* Card 3: Channel Strategy */}
            <ChannelStrategyCard mix={plan.channel_mix} accentColor={accentColor} />

            {/* Card 4: Audience Blueprint */}
            <AudienceBlueprintCard targeting={plan.audience_targeting} accentColor={accentColor} />

            {/* Card 5: Budget Projection — full width, conditional */}
            {plan.budget_projection && (
              <div className="md:col-span-2">
                <BudgetProjectionCard projection={plan.budget_projection} accentColor={accentColor} />
              </div>
            )}
          </div>

          {/* AI Insights Section */}
          {aiLoading && (
            <div className="rounded-lg border border-violet-200 bg-violet-50/50 p-6">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
                <div>
                  <p className="text-sm font-semibold text-violet-700">
                    Generating AI insights...
                  </p>
                  <p className="text-xs text-violet-500 mt-0.5">
                    Analyzing strategy, generating ad copy, and reviewing compliance
                  </p>
                </div>
              </div>
            </div>
          )}

          {aiError && !aiLoading && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-gray">
              AI insights unavailable. Data-driven recommendations are shown above.
            </div>
          )}

          {aiInsights && !aiLoading && (
            <div className="space-y-6">
              <AiStrategicBriefCard insights={aiInsights} />

              {/* AI Creative Images Toggle */}
              <div className="rounded-lg bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5 text-violet-500" />
                    <h3 className="font-heading text-base font-semibold text-midnight-navy">
                      Generate AI Creative Images?
                    </h3>
                    <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-600">
                      Beta
                    </span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={aiCreativeEnabled}
                    onClick={() => {
                      const next = !aiCreativeEnabled;
                      setAiCreativeEnabled(next);
                      if (next && creativeImages.every((img) => img === null)) {
                        generateAllCreativeImages();
                      }
                    }}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                      aiCreativeEnabled ? "bg-violet-500" : "bg-slate-200"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                        aiCreativeEnabled ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-gray">
                  Uses AI to generate background images for ad creatives. Gradient mockups are used as fallback.
                </p>
              </div>

              <AiAdCopyCard
                adCopy={aiInsights.ad_copy}
                tortName={selectedTort}
                brandLogoUrl={brandAssets.find((a) => a.name.toLowerCase().includes("logo"))?.url ?? null}
                firmName={firmName.trim()}
                brandColors={brandColors}
                aiCreativeEnabled={aiCreativeEnabled}
                creativeImages={creativeImages}
                creativeLoading={creativeLoading}
                onRegenerateImage={generateCreativeImage}
              />
              <AiIntelligenceComplianceCard insights={aiInsights} />

              {/* AI Radio / Podcast Spot — only shown when ElevenLabs is configured */}
              {radioSpotAvailable && (
                <AiRadioSpotCard
                  expanded={radioExpanded}
                  onToggleExpand={handleRadioExpand}
                  format={radioFormat}
                  onFormatChange={(f) => {
                    setRadioFormat(f);
                    if (radioScriptGenerated) {
                      setRadioScript("");
                      setRadioScriptGenerated(false);
                      setRadioAudioUrl(null);
                      generateRadioScript(radioDuration, f);
                    }
                  }}
                  duration={radioDuration}
                  onDurationChange={(d) => {
                    setRadioDuration(d);
                    if (radioScriptGenerated) {
                      setRadioScript("");
                      setRadioScriptGenerated(false);
                      setRadioAudioUrl(null);
                      generateRadioScript(d, radioFormat);
                    }
                  }}
                  script={radioScript}
                  onScriptChange={setRadioScript}
                  scriptLoading={radioScriptLoading}
                  voices={radioVoices}
                  voicesLoading={radioVoicesLoading}
                  selectedVoice={radioSelectedVoice}
                  onVoiceChange={setRadioSelectedVoice}
                  generating={radioGenerating}
                  audioUrl={radioAudioUrl}
                  error={radioError}
                  cooldown={radioCooldown}
                  onGenerate={generateRadioSpot}
                  onRegenerate={() => {
                    setRadioAudioUrl(null);
                    generateRadioSpot();
                  }}
                  voiceRecommendation={voiceRecommendation}
                  audienceContext={audienceContext}
                />
              )}

              {/* AI Video Composition */}
              <VideoCompositionCard
                expanded={videoExpanded}
                onToggleExpand={() => setVideoExpanded(!videoExpanded)}
                tortName={selectedTort}
                firmName={firmName.trim()}
                states={selectedStates}
                language={language}
              />
            </div>
          )}

          {/* Landing Page Steps — shown after AI insights load or error */}
          {(aiInsights || aiError) && !aiLoading && (
            <LandingPageSteps
              hasLandingPage={hasLandingPage}
              setHasLandingPage={setHasLandingPage}
              wantsLandingPage={wantsLandingPage}
              setWantsLandingPage={setWantsLandingPage}
              qualificationStyle={qualificationStyle}
              setQualificationStyle={setQualificationStyle}
              matchedCriteria={matchedCriteria}
              selectedQuestionIds={selectedQuestionIds}
              customQuestions={customQuestions}
              totalSelectedQuestions={totalSelectedQuestions}
              onToggleQuestion={toggleQuestion}
              onAddCustomQuestion={addCustomQuestion}
              onUpdateCustomQuestion={updateCustomQuestion}
              onRemoveCustomQuestion={removeCustomQuestion}
              formPages={formPages}
              activeFormPageTab={activeFormPageTab}
              setActiveFormPageTab={setActiveFormPageTab}
              landingPageHtml={landingPageHtml}
              landingPageTitle={landingPageTitle}
              landingPages={landingPages}
              landingPagesTitle={landingPagesTitle}
              activePageTab={activePageTab}
              setActivePageTab={setActivePageTab}
              landingPageLoading={landingPageLoading}
              landingPageError={landingPageError}
              copied={copied}
              onGenerate={generateLandingPage}
              onDownload={downloadLandingPage}
              onDownloadCurrent={downloadCurrentPage}
              onCopy={copyLandingPageHtml}
              accentColor={accentColor}
            />
          )}

          {/* Export Button */}
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={handleExport}
              disabled={!canExport}
              className={`inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white transition-colors ${
                canExport
                  ? "bg-intelligence-teal hover:bg-intelligence-teal/90 shadow-sm"
                  : "bg-slate-300 cursor-not-allowed"
              }`}
            >
              {exporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Preparing export...
                </>
              ) : exportDone ? (
                <>
                  <Check className="h-4 w-4" />
                  Campaign exported — 2 files ready for upload
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Download Campaign Plan
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Card Components ────────────────────────────────────────────────────── */

function TortIntelligenceCard({
  overview,
  accentColor,
}: {
  overview: CampaignPlan["tort_overview"];
  accentColor: string;
}) {
  const phase = PHASE_STYLE[overview.lifecycle_phase];
  const TrendIcon =
    overview.trend_direction === "up"
      ? TrendingUp
      : overview.trend_direction === "down"
        ? TrendingDown
        : Minus;
  const trendColor =
    overview.trend_direction === "up"
      ? "#10B981"
      : overview.trend_direction === "down"
        ? "#EF4444"
        : "#6B7280";

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="h-5 w-5" style={{ color: accentColor }} />
        <h3 className="font-heading text-lg font-semibold text-midnight-navy">
          Tort Intelligence
        </h3>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-midnight-navy">{overview.tort_name}</span>
          {phase && (
            <span
              className="rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide"
              style={{ backgroundColor: phase.bg, color: phase.color }}
            >
              {phase.label}
            </span>
          )}
          <span className="flex items-center gap-1 text-xs" style={{ color: trendColor }}>
            <TrendIcon className="h-3.5 w-3.5" />
            {overview.trend_direction === "up" ? "Rising" : overview.trend_direction === "down" ? "Declining" : "Stable"} interest
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md bg-cloud p-3">
            <p className="text-xs text-slate-gray uppercase tracking-wider">CPL Range</p>
            <p className="mt-1 text-sm font-semibold font-mono text-midnight-navy">
              {fmtRange(overview.cpl_range.low, overview.cpl_range.high)}
            </p>
          </div>
          <div className="rounded-md bg-cloud p-3">
            <p className="text-xs text-slate-gray uppercase tracking-wider">CPA Range</p>
            <p className="mt-1 text-sm font-semibold font-mono text-midnight-navy">
              {fmtRange(overview.cpa_range.low, overview.cpa_range.high)}
            </p>
          </div>
          <div className="rounded-md bg-cloud p-3">
            <p className="text-xs text-slate-gray uppercase tracking-wider">CPK Range</p>
            <p className="mt-1 text-sm font-semibold font-mono text-midnight-navy">
              {fmtRange(overview.cpk_range.low, overview.cpk_range.high)}
            </p>
          </div>
          <div className="rounded-md bg-cloud p-3">
            <p className="text-xs text-slate-gray uppercase tracking-wider">Lead → Retainer</p>
            <p className="mt-1 text-sm font-semibold font-mono text-midnight-navy">
              {fmtPct(overview.lead_to_retainer_pct)}
            </p>
          </div>
        </div>

        {overview.latest_mdl && (
          <div className="rounded-md border border-slate-100 p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1">
              Latest MDL Development
            </p>
            <p className="text-sm font-medium text-midnight-navy">{overview.latest_mdl.title}</p>
            {overview.latest_mdl.summary && (
              <p className="mt-1 text-xs text-slate-gray">{overview.latest_mdl.summary}</p>
            )}
            <p className="mt-1 text-xs text-slate-gray">
              {new Date(overview.latest_mdl.date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function GeoTargetingCard({
  geoRecs,
  dmas,
  accentColor,
}: {
  geoRecs: CampaignPlan["geo_recommendations"];
  dmas: CampaignPlan["relevant_dmas"];
  accentColor: string;
}) {
  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="h-5 w-5" style={{ color: accentColor }} />
        <h3 className="font-heading text-lg font-semibold text-midnight-navy">
          Geographic Targeting
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-cloud">
              <th className="py-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                State
              </th>
              <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">
                Population
              </th>
              <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">
                Incidence
              </th>
              <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-center">
                Saturation
              </th>
              <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-center">
                Opportunity
              </th>
            </tr>
          </thead>
          <tbody>
            {geoRecs.map((rec) => {
              const style = OPPORTUNITY_STYLE[rec.opportunity_level];
              return (
                <tr
                  key={rec.state}
                  className="border-b border-cloud/50 hover:bg-cloud/40 transition-colors"
                >
                  <td className="py-3 pr-4 font-medium text-midnight-navy">
                    {rec.state} — {STATE_NAMES[rec.state] ?? rec.state}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-sm text-midnight-navy">
                    {fmtNumber(rec.population)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-sm text-midnight-navy">
                    {fmtNumber(rec.incidence)}
                  </td>
                  <td className="py-3 px-3 text-center text-sm text-midnight-navy">
                    {rec.saturation_score}/100
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span
                      className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase"
                      style={{ backgroundColor: style?.bg, color: style?.color }}
                    >
                      {rec.opportunity_level} ({rec.opportunity_score})
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {dmas.length > 0 && (
        <div className="mt-4 rounded-md bg-cloud p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-2">
            Recommended DMAs
          </p>
          <div className="flex flex-wrap gap-2">
            {dmas.map((dma, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
                style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
              >
                <MapPin className="h-3 w-3" />
                {dma.name}
                {dma.population ? ` (${fmtNumber(dma.population)} pop.)` : ""}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ChannelStrategyCard({
  mix,
  accentColor,
}: {
  mix: CampaignPlan["channel_mix"];
  accentColor: string;
}) {
  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Megaphone className="h-5 w-5" style={{ color: accentColor }} />
        <h3 className="font-heading text-lg font-semibold text-midnight-navy">
          Channel Strategy
        </h3>
      </div>

      <p className="text-xs text-slate-gray mb-4 italic">{mix.lifecycle_note}</p>

      {/* Budget allocation bar */}
      <div className="mb-4">
        <div className="flex h-3 rounded-full overflow-hidden">
          <div className="bg-intelligence-teal" style={{ width: "50%" }} title="Core 50%" />
          <div className="bg-steel-blue" style={{ width: "30%" }} title="Secondary 30%" />
          <div className="bg-slate-gray" style={{ width: "20%" }} title="Situational 20%" />
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-slate-gray">
          <span>Core (50%)</span>
          <span>Secondary (30%)</span>
          <span>Situational (20%)</span>
        </div>
      </div>

      {/* Primary channels */}
      {mix.primary.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-intelligence-teal mb-2">
            Primary Channels
          </p>
          <div className="space-y-2">
            {mix.primary.map((ch, i) => (
              <div key={i} className="flex items-center justify-between rounded-md bg-cloud p-2.5">
                <div>
                  <span className="text-sm font-medium text-midnight-navy">
                    {channelLabel(ch.channel)}
                  </span>
                  <span className="ml-2 text-xs text-slate-gray">{ch.role}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CostPressureBadge level={ch.cost_pressure} />
                  <span className="text-xs font-mono text-midnight-navy">
                    {ch.allocation_pct.toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Secondary channels */}
      {mix.secondary.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-steel-blue mb-2">
            Secondary Channels
          </p>
          <div className="space-y-2">
            {mix.secondary.map((ch, i) => (
              <div key={i} className="flex items-center justify-between rounded-md bg-cloud p-2.5">
                <div>
                  <span className="text-sm font-medium text-midnight-navy">
                    {channelLabel(ch.channel)}
                  </span>
                  <span className="ml-2 text-xs text-slate-gray">{ch.role}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CostPressureBadge level={ch.cost_pressure} />
                  <span className="text-xs font-mono text-midnight-navy">
                    {ch.allocation_pct.toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Situational channels */}
      {mix.situational.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-2">
            Situational Channels
          </p>
          <div className="flex flex-wrap gap-1.5">
            {mix.situational.map((ch, i) => (
              <span
                key={i}
                className="rounded-full bg-cloud px-2.5 py-1 text-xs text-midnight-navy"
              >
                {channelLabel(ch.channel)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CostPressureBadge({ level }: { level: string }) {
  const colors: Record<string, { color: string; bg: string }> = {
    high:   { color: "#EF4444", bg: "#FEF2F2" },
    medium: { color: "#F59E0B", bg: "#FFFBEB" },
    low:    { color: "#10B981", bg: "#ECFDF5" },
  };
  const style = colors[level] ?? colors.medium;
  return (
    <span
      className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase"
      style={{ backgroundColor: style.bg, color: style.color }}
    >
      {level}
    </span>
  );
}

function AudienceBlueprintCard({
  targeting,
  accentColor,
}: {
  targeting: CampaignPlan["audience_targeting"];
  accentColor: string;
}) {
  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Users className="h-5 w-5" style={{ color: accentColor }} />
        <h3 className="font-heading text-lg font-semibold text-midnight-navy">
          Audience Blueprint
        </h3>
      </div>

      <div className="space-y-4">
        {/* Age Ranges */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-2">
            Age Targeting
          </p>
          <div className="flex flex-wrap gap-1.5">
            {targeting.meta_targeting.age_ranges.map((range, i) => (
              <span
                key={i}
                className="rounded-full px-2.5 py-1 text-xs font-medium"
                style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
              >
                {range}
              </span>
            ))}
          </div>
        </div>

        {/* Meta Targeting */}
        <div className="rounded-md bg-cloud p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-2">
            Meta (Facebook/Instagram)
          </p>
          <p className="text-xs text-slate-gray mb-1">Interest targeting:</p>
          <div className="flex flex-wrap gap-1">
            {targeting.meta_targeting.interests.map((interest, i) => (
              <span key={i} className="rounded bg-white px-2 py-0.5 text-xs text-midnight-navy border border-slate-100">
                {interest}
              </span>
            ))}
          </div>
        </div>

        {/* Google Targeting */}
        <div className="rounded-md bg-cloud p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-2">
            Google Ads
          </p>
          <p className="text-xs text-slate-gray mb-1">Keyword themes:</p>
          <div className="flex flex-wrap gap-1 mb-2">
            {targeting.google_targeting.keyword_themes.map((kw, i) => (
              <span key={i} className="rounded bg-white px-2 py-0.5 text-xs font-mono text-midnight-navy border border-slate-100">
                {kw}
              </span>
            ))}
          </div>
          <p className="text-xs text-slate-gray mb-1">Audience segments:</p>
          <div className="flex flex-wrap gap-1">
            {targeting.google_targeting.audience_segments.map((seg, i) => (
              <span key={i} className="rounded bg-white px-2 py-0.5 text-xs text-midnight-navy border border-slate-100">
                {seg}
              </span>
            ))}
          </div>
        </div>

        <p className="text-xs text-slate-gray italic">{targeting.state_specific_notes}</p>
      </div>
    </div>
  );
}

function BudgetProjectionCard({
  projection,
  accentColor,
}: {
  projection: NonNullable<CampaignPlan["budget_projection"]>;
  accentColor: string;
}) {
  const splits = [projection.channel_split.core, projection.channel_split.secondary, projection.channel_split.situational];
  const maxAmount = Math.max(...splits.map((s) => s.amount));

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <DollarSign className="h-5 w-5" style={{ color: accentColor }} />
        <h3 className="font-heading text-lg font-semibold text-midnight-navy">
          Budget Projection
        </h3>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md bg-cloud p-3">
            <p className="text-xs text-slate-gray uppercase tracking-wider">Monthly Budget</p>
            <p className="mt-1 text-lg font-bold font-mono text-midnight-navy">
              {fmtCurrency(projection.monthly_budget)}
            </p>
          </div>
          <div className="rounded-md bg-cloud p-3">
            <p className="text-xs text-slate-gray uppercase tracking-wider">Avg CPL</p>
            <p className="mt-1 text-lg font-bold font-mono text-midnight-navy">
              {fmtCurrency(projection.avg_cpl)}
            </p>
          </div>
          <div className="rounded-md p-3" style={{ backgroundColor: `${accentColor}10` }}>
            <p className="text-xs uppercase tracking-wider" style={{ color: accentColor }}>
              Expected Leads/mo
            </p>
            <p className="mt-1 text-lg font-bold font-mono text-midnight-navy">
              {fmtNumber(projection.expected_leads_per_month)}
            </p>
          </div>
          <div className="rounded-md p-3" style={{ backgroundColor: `${accentColor}10` }}>
            <p className="text-xs uppercase tracking-wider" style={{ color: accentColor }}>
              Expected Retainers/mo
            </p>
            <p className="mt-1 text-lg font-bold font-mono text-midnight-navy">
              {fmtNumber(projection.expected_retainers_per_month)}
            </p>
          </div>
          {projection.cost_per_kept_case && (
            <div className="col-span-2 rounded-md bg-cloud p-3">
              <p className="text-xs text-slate-gray uppercase tracking-wider">Cost Per Kept Case</p>
              <p className="mt-1 text-lg font-bold font-mono text-midnight-navy">
                {fmtCurrency(projection.cost_per_kept_case)}
              </p>
            </div>
          )}
        </div>

        {/* Channel Split Bar Chart */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-3">
            Monthly Channel Split
          </p>
          <div className="space-y-3">
            {splits.map((split, i) => {
              const barColors = ["#1A8C96", "#2E5077", "#6B7280"];
              const widthPct = maxAmount > 0 ? (split.amount / maxAmount) * 100 : 0;
              return (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-midnight-navy font-medium">
                      {split.label} ({split.pct}%)
                    </span>
                    <span className="font-mono text-midnight-navy font-semibold">
                      {fmtCurrency(split.amount)}
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-cloud overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${widthPct}%`,
                        backgroundColor: barColors[i],
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-slate-gray">
            Conv. rate: {fmtPct(projection.lead_to_retainer_pct)} lead-to-retainer
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── AI Card Components ────────────────────────────────────────────────── */

function AiBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-600">
      <Sparkles className="h-3 w-3" />
      AI
    </span>
  );
}

function AiStrategicBriefCard({ insights }: { insights: AiInsights }) {
  return (
    <div className="rounded-lg border-l-4 border-l-violet-400 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-violet-500" />
          <h3 className="font-heading text-lg font-semibold text-midnight-navy">
            AI Strategic Brief
          </h3>
        </div>
        <AiBadge />
      </div>

      <div className="space-y-4">
        {/* Strategic Narrative */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-2">
            Strategic Overview
          </p>
          <div className="text-sm leading-relaxed text-midnight-navy whitespace-pre-line">
            {insights.strategic_brief}
          </div>
        </div>

        {/* Market Context */}
        <div className="rounded-md bg-violet-50/50 border border-violet-100 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-600 mb-2">
            Market Context & External Intelligence
          </p>
          <div className="text-sm leading-relaxed text-midnight-navy">
            {insights.market_context}
          </div>
        </div>

        {/* Historical Playbook */}
        <div className="rounded-md bg-cloud p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-2">
            Historical Playbook
          </p>
          <div className="text-sm leading-relaxed text-midnight-navy">
            {insights.historical_playbook}
          </div>
        </div>
      </div>
    </div>
  );
}

const AD_CREATIVE_THEMES = [
  { from: "#0f172a", to: "#1e3a5f", accent: "#3b82f6" },
  { from: "#1a1a2e", to: "#16213e", accent: "#6366f1" },
  { from: "#0d1b2a", to: "#1b2d4f", accent: "#06b6d4" },
  { from: "#1e1b4b", to: "#312e81", accent: "#a78bfa" },
  { from: "#162032", to: "#1c3d5a", accent: "#2dd4bf" },
];

function AdCreativeMockup({
  headline,
  tortName,
  variantIndex,
  brandLogoUrl,
  firmName,
  aiImageUrl,
  isLoading,
  onRegenerate,
  brandColors,
}: {
  headline: string;
  tortName: string;
  variantIndex: number;
  brandLogoUrl?: string | null;
  firmName?: string;
  aiImageUrl?: string | null;
  isLoading?: boolean;
  onRegenerate?: () => void;
  brandColors?: BrandColors;
}) {
  const defaultTheme = AD_CREATIVE_THEMES[variantIndex % AD_CREATIVE_THEMES.length];
  // Use brand colors if available, otherwise default theme
  const theme = brandColors?.primary
    ? {
        from: brandColors.primary,
        to: brandColors.secondary ?? defaultTheme.to,
        accent: brandColors.accent ?? defaultTheme.accent,
      }
    : defaultTheme;

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="relative h-44 flex flex-col items-center justify-center overflow-hidden bg-slate-100">
        <div className="animate-pulse flex flex-col items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
          <p className="text-xs text-slate-gray">Generating image...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative h-44 flex flex-col items-center justify-center overflow-hidden px-5"
      style={
        aiImageUrl
          ? { backgroundImage: `url(${aiImageUrl})`, backgroundSize: "cover", backgroundPosition: "center top" }
          : { background: `linear-gradient(135deg, ${theme.from} 0%, ${theme.to} 100%)` }
      }
    >
      {/* Dark overlay for AI images to ensure text readability */}
      {aiImageUrl && (
        <div className="absolute inset-0 bg-black/40" />
      )}

      {/* Subtle pattern overlay (gradient only) */}
      {!aiImageUrl && (
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        />
      )}

      {/* Decorative accent line */}
      <div
        className="absolute top-0 left-0 h-1 w-full z-10"
        style={{ background: `linear-gradient(90deg, ${theme.accent}, transparent)` }}
      />

      {/* Regenerate button */}
      {onRegenerate && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRegenerate();
          }}
          className="absolute top-2 right-2 z-20 rounded-md bg-black/40 p-1 text-white/70 hover:text-white hover:bg-black/60 transition-colors"
          title="Regenerate image"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Scales of justice icon (gradient only) */}
      {!aiImageUrl && (
        <div className="absolute bottom-3 right-3 opacity-10">
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 3v19" />
            <path d="M5 7l7-4 7 4" />
            <circle cx="5" cy="7" r="0.5" fill="white" />
            <circle cx="19" cy="7" r="0.5" fill="white" />
            <path d="M2 14c0-1.7 1.3-3 3-3s3 1.3 3 3H2z" />
            <path d="M16 14c0-1.7 1.3-3 3-3s3 1.3 3 3h-6z" />
            <rect x="10" y="2" width="4" height="2" rx="1" fill="white" opacity="0.3" />
          </svg>
        </div>
      )}

      {/* Brand logo overlay */}
      {brandLogoUrl && !onRegenerate && (
        <div className="absolute top-3 right-3 z-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={brandLogoUrl}
            alt="Brand logo"
            className="h-8 w-auto max-w-[72px] object-contain drop-shadow-md"
          />
        </div>
      )}
      {brandLogoUrl && onRegenerate && (
        <div className="absolute top-2 right-10 z-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={brandLogoUrl}
            alt="Brand logo"
            className="h-8 w-auto max-w-[72px] object-contain drop-shadow-md"
          />
        </div>
      )}

      {/* Tort type badge */}
      {tortName && (
        <div className="absolute top-3 left-3 z-10">
          <span
            className="inline-block rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/90"
            style={{ backgroundColor: `${theme.accent}99` }}
          >
            {tortName}
          </span>
        </div>
      )}

      {/* Headline overlay */}
      <p className="relative z-10 text-center text-base font-bold leading-snug text-white drop-shadow-md sm:text-lg">
        {headline}
      </p>

      {/* Firm name byline */}
      {firmName && (
        <p className="absolute bottom-2.5 left-3 z-10 text-[10px] text-white/60 tracking-wide">
          {firmName}
        </p>
      )}

      {/* Decorative bottom accent */}
      <div
        className="absolute bottom-0 left-0 h-0.5 w-full opacity-40 z-10"
        style={{ background: `linear-gradient(90deg, transparent, ${theme.accent}, transparent)` }}
      />
    </div>
  );
}

function AiAdCopyCard({
  adCopy,
  tortName,
  brandLogoUrl,
  firmName,
  brandColors,
  aiCreativeEnabled,
  creativeImages,
  creativeLoading,
  onRegenerateImage,
}: {
  adCopy: AiInsights["ad_copy"];
  tortName: string;
  brandLogoUrl?: string | null;
  firmName?: string;
  brandColors?: BrandColors;
  aiCreativeEnabled?: boolean;
  creativeImages?: (string | null)[];
  creativeLoading?: boolean[];
  onRegenerateImage?: (index: number) => void;
}) {
  const displayUrl = "www.example.com/legal";
  return (
    <div className="rounded-lg border-l-4 border-l-violet-400 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-violet-500" />
          <h3 className="font-heading text-lg font-semibold text-midnight-navy">
            AI-Generated Ad Copy
          </h3>
        </div>
        <AiBadge />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Meta Ad Preview */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-3">
            Meta (Facebook / Instagram)
          </p>
          <div className="space-y-3">
            {adCopy.meta.headlines.map((headline, i) => (
              <div
                key={i}
                className="rounded-lg border border-slate-200 overflow-hidden"
              >
                <AdCreativeMockup
                  headline={headline}
                  tortName={tortName}
                  variantIndex={i}
                  brandLogoUrl={brandLogoUrl}
                  firmName={firmName}
                  brandColors={brandColors}
                  aiImageUrl={aiCreativeEnabled ? creativeImages?.[i] : null}
                  isLoading={aiCreativeEnabled && (creativeLoading?.[i] ?? false)}
                  onRegenerate={aiCreativeEnabled && onRegenerateImage ? () => onRegenerateImage(i) : undefined}
                />
                <div className="p-3 space-y-2">
                  <p className="text-sm font-semibold text-midnight-navy leading-tight">
                    {headline}
                  </p>
                  {adCopy.meta.body_options[i] && (
                    <p className="text-xs text-slate-gray leading-relaxed">
                      {adCopy.meta.body_options[i]}
                    </p>
                  )}
                  {adCopy.meta.ctas[i] && (
                    <button className="w-full rounded-md bg-violet-500 py-1.5 text-xs font-semibold text-white">
                      {adCopy.meta.ctas[i]}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Google Search Ad Preview */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-3">
            Google Search (RSA Format)
          </p>
          <div className="space-y-3">
            <div className="rounded-lg border border-slate-200 p-4 space-y-2 bg-white">
              <p className="text-xs text-slate-gray">Ad preview</p>
              {/* RSA headline combinations */}
              <div>
                <p className="text-base font-medium text-blue-700 leading-snug">
                  {adCopy.google_search.headlines.slice(0, 3).join(" | ")}
                </p>
                <p className="text-xs text-green-700 mt-1">
                  {displayUrl}
                </p>
              </div>
              {adCopy.google_search.descriptions[0] && (
                <p className="text-sm text-midnight-navy leading-relaxed">
                  {adCopy.google_search.descriptions[0]}
                </p>
              )}
            </div>

            {/* All headlines */}
            <div className="rounded-md bg-cloud p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-2">
                RSA Headlines (30 char max)
              </p>
              <div className="space-y-1">
                {adCopy.google_search.headlines.map((h, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded bg-white px-2 py-1 border border-slate-100"
                  >
                    <span className="text-xs text-midnight-navy">{h}</span>
                    <span
                      className={`text-[10px] font-mono ${h.length > 30 ? "text-alert" : "text-slate-gray"}`}
                    >
                      {h.length}/30
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* All descriptions */}
            <div className="rounded-md bg-cloud p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-2">
                RSA Descriptions (90 char max)
              </p>
              <div className="space-y-1">
                {adCopy.google_search.descriptions.map((d, i) => (
                  <div
                    key={i}
                    className="flex items-start justify-between gap-2 rounded bg-white px-2 py-1.5 border border-slate-100"
                  >
                    <span className="text-xs text-midnight-navy leading-relaxed">
                      {d}
                    </span>
                    <span
                      className={`text-[10px] font-mono shrink-0 ${d.length > 90 ? "text-alert" : "text-slate-gray"}`}
                    >
                      {d.length}/90
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AiIntelligenceComplianceCard({
  insights,
}: {
  insights: AiInsights;
}) {
  return (
    <div className="rounded-lg border-l-4 border-l-violet-400 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-violet-500" />
          <h3 className="font-heading text-lg font-semibold text-midnight-navy">
            Intelligence & Compliance
          </h3>
        </div>
        <AiBadge />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Left: Opportunities + Competitive Insights */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Lightbulb className="h-4 w-4 text-success" />
              <p className="text-xs font-semibold uppercase tracking-wider text-success">
                Opportunities
              </p>
            </div>
            <ul className="space-y-1.5">
              {insights.opportunities.map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-midnight-navy"
                >
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-md bg-cloud p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Search className="h-4 w-4 text-steel-blue" />
              <p className="text-xs font-semibold uppercase tracking-wider text-steel-blue">
                Competitive Insights
              </p>
            </div>
            <p className="text-sm text-midnight-navy leading-relaxed">
              {insights.competitive_insights}
            </p>
          </div>
        </div>

        {/* Right: Risk Factors + Compliance Notes */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <p className="text-xs font-semibold uppercase tracking-wider text-warning">
                Risk Factors
              </p>
            </div>
            <ul className="space-y-1.5">
              {insights.risk_factors.map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-midnight-navy"
                >
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-md bg-violet-50/50 border border-violet-100 p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Shield className="h-4 w-4 text-violet-500" />
              <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">
                Compliance Notes
              </p>
            </div>
            <ul className="space-y-1.5">
              {insights.compliance_notes.map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-midnight-navy"
                >
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── AI Radio / Podcast Spot Card ─────────────────────────────────────── */

const SPOT_FORMATS = [
  { value: "radio" as const, label: "Radio" },
  { value: "podcast" as const, label: "Podcast" },
];

function AiRadioSpotCard({
  expanded,
  onToggleExpand,
  format,
  onFormatChange,
  duration,
  onDurationChange,
  script,
  onScriptChange,
  scriptLoading,
  voices,
  voicesLoading,
  selectedVoice,
  onVoiceChange,
  generating,
  audioUrl,
  error,
  cooldown,
  onGenerate,
  onRegenerate,
  voiceRecommendation,
  audienceContext,
}: {
  expanded: boolean;
  onToggleExpand: () => void;
  format: "radio" | "podcast";
  onFormatChange: (f: "radio" | "podcast") => void;
  duration: "15s" | "30s" | "60s";
  onDurationChange: (d: "15s" | "30s" | "60s") => void;
  script: string;
  onScriptChange: (s: string) => void;
  scriptLoading: boolean;
  voices: { id: string; name: string; description: string; category: string; previewUrl: string }[];
  voicesLoading: boolean;
  selectedVoice: string;
  onVoiceChange: (id: string) => void;
  generating: boolean;
  audioUrl: string | null;
  error: string | null;
  cooldown: boolean;
  onGenerate: () => void;
  onRegenerate: () => void;
  voiceRecommendation?: { gender: string; style: string; reason: string } | null;
  audienceContext?: { primary_age_bands: string; audience_note: string } | null;
}) {
  const wordCount = script.trim() ? script.trim().split(/\s+/).length : 0;
  const charCount = script.length;
  const targetWords =
    format === "podcast"
      ? duration === "15s" ? "35-40" : duration === "30s" ? "85-95" : "170-190"
      : duration === "15s" ? "35-40" : duration === "30s" ? "75-80" : "150-160";
  const formatLabel = format === "podcast" ? "Podcast" : "Radio";

  return (
    <div className="rounded-lg border-l-4 border-l-violet-400 bg-white shadow-sm">
      {/* Collapsible header */}
      <button
        type="button"
        onClick={onToggleExpand}
        className="flex w-full items-center justify-between p-6"
      >
        <div className="flex items-center gap-2">
          <Mic className="h-5 w-5 text-violet-500" />
          <h3 className="font-heading text-lg font-semibold text-midnight-navy">
            AI Radio or Podcast Spot
          </h3>
          <AiBadge />
        </div>
        {expanded ? (
          <ChevronUp className="h-5 w-5 text-slate-gray" />
        ) : (
          <ChevronDown className="h-5 w-5 text-slate-gray" />
        )}
      </button>

      {/* Expandable content */}
      {expanded && (
        <div className="border-t border-slate-100 px-6 pb-6 space-y-5">
          {/* Format selector */}
          <div className="pt-4">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-2 block">
              Format
            </label>
            <div className="flex gap-2">
              {SPOT_FORMATS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => onFormatChange(f.value)}
                  className={`rounded-lg border-2 px-4 py-2 text-sm font-semibold transition-colors ${
                    format === f.value
                      ? "border-violet-500 bg-violet-500 text-white"
                      : "border-slate-200 text-midnight-navy hover:border-slate-300"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Duration toggle */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-2 block">
              Duration
            </label>
            <div className="flex gap-2">
              {(["15s", "30s", "60s"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => onDurationChange(d)}
                  className={`rounded-lg border-2 px-4 py-2 text-sm font-semibold transition-colors ${
                    duration === d
                      ? "border-violet-500 bg-violet-500 text-white"
                      : "border-slate-200 text-midnight-navy hover:border-slate-300"
                  }`}
                >
                  {d === "15s" ? "15 seconds" : d === "30s" ? "30 seconds" : "60 seconds"}
                </button>
              ))}
            </div>
          </div>

          {/* Script textarea */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-2 block">
              Script
            </label>
            {scriptLoading ? (
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
                <span className="text-sm text-slate-gray">
                  Generating {duration === "15s" ? "15-second" : duration === "30s" ? "30-second" : "60-second"} {format === "podcast" ? "podcast" : "radio"} script...
                </span>
              </div>
            ) : (
              <textarea
                value={script}
                onChange={(e) => onScriptChange(e.target.value)}
                placeholder={`Enter your ${format === "podcast" ? "podcast ad" : "radio spot"} script here, or wait for AI generation...`}
                rows={duration === "15s" ? 3 : duration === "30s" ? 4 : 7}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-midnight-navy placeholder:text-slate-400 focus:border-violet-300 focus:outline-none focus:ring-1 focus:ring-violet-300 resize-none"
              />
            )}
            <div className="mt-1 flex items-center justify-between text-xs text-slate-gray">
              <span>
                {charCount} characters &middot; ~{wordCount} words
              </span>
              <span>Target: {targetWords} words for {duration}</span>
            </div>
          </div>

          {/* Audience context */}
          {audienceContext?.audience_note && (
            <div className="text-xs text-slate-gray">
              <span className="font-medium">Audience:</span> {audienceContext.audience_note}
            </div>
          )}

          {/* Voice selection */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-2 block">
              Voice
            </label>
            {voiceRecommendation && (
              <div className="mb-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-700">
                Recommended: {voiceRecommendation.gender.charAt(0).toUpperCase() + voiceRecommendation.gender.slice(1)} · {voiceRecommendation.style} — {voiceRecommendation.reason}
              </div>
            )}
            {voicesLoading ? (
              <div className="flex items-center gap-2 text-sm text-slate-gray">
                <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
                Loading voices...
              </div>
            ) : voices.length > 0 ? (
              <select
                value={selectedVoice}
                onChange={(e) => onVoiceChange(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-midnight-navy focus:border-violet-300 focus:outline-none focus:ring-1 focus:ring-violet-300"
              >
                {voices.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} — {v.description}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-slate-gray">
                No voices available. Please try again later.
              </p>
            )}
          </div>

          {/* Error message */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Generate button */}
          <button
            type="button"
            onClick={onGenerate}
            disabled={!script.trim() || !selectedVoice || generating || cooldown}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-white transition-colors ${
              !script.trim() || !selectedVoice || generating || cooldown
                ? "bg-slate-300 cursor-not-allowed"
                : "bg-violet-500 hover:bg-violet-600 shadow-sm"
            }`}
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating Audio Ad...
              </>
            ) : (
              <>
                <Mic className="h-4 w-4" />
                Generate Audio Ad
              </>
            )}
          </button>

          {/* Audio player */}
          {audioUrl && (
            <div className="space-y-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <audio
                  src={audioUrl}
                  controls
                  className="w-full"
                />
              </div>

              <div className="flex gap-2">
                <a
                  href={audioUrl}
                  download={`${format}-spot-${duration}.mp3`}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-midnight-navy hover:bg-slate-50 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Download MP3
                </a>
                <button
                  type="button"
                  onClick={onRegenerate}
                  disabled={generating || cooldown}
                  className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
                    generating || cooldown
                      ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                      : "border-violet-200 bg-violet-50 text-violet-600 hover:bg-violet-100"
                  }`}
                >
                  <RefreshCw className="h-4 w-4" />
                  Regenerate
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Landing Page Steps ────────────────────────────────────────────────── */

function LandingPageSteps({
  hasLandingPage,
  setHasLandingPage,
  wantsLandingPage,
  setWantsLandingPage,
  qualificationStyle,
  setQualificationStyle,
  matchedCriteria,
  selectedQuestionIds,
  customQuestions,
  totalSelectedQuestions,
  onToggleQuestion,
  onAddCustomQuestion,
  onUpdateCustomQuestion,
  onRemoveCustomQuestion,
  formPages,
  activeFormPageTab,
  setActiveFormPageTab,
  landingPageHtml,
  landingPageTitle,
  landingPages,
  landingPagesTitle,
  activePageTab,
  setActivePageTab,
  landingPageLoading,
  landingPageError,
  copied,
  onGenerate,
  onDownload,
  onDownloadCurrent,
  onCopy,
  accentColor,
}: {
  hasLandingPage: boolean | null;
  setHasLandingPage: (v: boolean | null) => void;
  wantsLandingPage: boolean | null;
  setWantsLandingPage: (v: boolean | null) => void;
  qualificationStyle: "multi-step" | "single-page" | null;
  setQualificationStyle: (v: "multi-step" | "single-page" | null) => void;
  matchedCriteria: TortQualificationCriteria | undefined;
  selectedQuestionIds: Set<string>;
  customQuestions: CustomQuestion[];
  totalSelectedQuestions: number;
  onToggleQuestion: (id: string) => void;
  onAddCustomQuestion: () => void;
  onUpdateCustomQuestion: (id: string, updates: Partial<CustomQuestion>) => void;
  onRemoveCustomQuestion: (id: string) => void;
  formPages: { label: string; questions: ScreeningQuestion[] }[];
  activeFormPageTab: number;
  setActiveFormPageTab: (v: number) => void;
  landingPageHtml: string | null;
  landingPageTitle: string | null;
  landingPages: { slug: string; html: string; title: string }[] | null;
  landingPagesTitle: string | null;
  activePageTab: string;
  setActivePageTab: (v: string) => void;
  landingPageLoading: boolean;
  landingPageError: string | null;
  copied: boolean;
  onGenerate: () => void;
  onDownload: () => void;
  onDownloadCurrent: () => void;
  onCopy: () => void;
  accentColor: string;
}) {
  const questionTypeLabel = (type: ScreeningQuestion["type"]) => {
    switch (type) {
      case "yes_no": return "Yes / No";
      case "select": return "Multiple choice";
      case "text": return "Free text";
      case "date": return "Date";
    }
  };

  return (
    <div className="space-y-6">
      {/* Step A: Do you have a landing page? */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="h-5 w-5" style={{ color: accentColor }} />
          <h3 className="font-heading text-lg font-semibold text-midnight-navy">
            Landing Page
          </h3>
        </div>
        <p className="text-sm text-slate-gray mb-4">
          Do you already have a landing page for this campaign?
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => {
              setHasLandingPage(true);
              setWantsLandingPage(null);
              setQualificationStyle(null);
            }}
            className={`flex-1 rounded-lg border-2 px-4 py-3 text-sm font-semibold transition-colors ${
              hasLandingPage === true
                ? "text-white"
                : "border-slate-200 text-midnight-navy hover:border-slate-300"
            }`}
            style={
              hasLandingPage === true
                ? { borderColor: accentColor, backgroundColor: accentColor }
                : undefined
            }
          >
            Yes, I have one
          </button>
          <button
            type="button"
            onClick={() => {
              setHasLandingPage(false);
              setWantsLandingPage(null);
              setQualificationStyle(null);
            }}
            className={`flex-1 rounded-lg border-2 px-4 py-3 text-sm font-semibold transition-colors ${
              hasLandingPage === false
                ? "text-white"
                : "border-slate-200 text-midnight-navy hover:border-slate-300"
            }`}
            style={
              hasLandingPage === false
                ? { borderColor: accentColor, backgroundColor: accentColor }
                : undefined
            }
          >
            No, I don&apos;t
          </button>
        </div>
      </div>

      {/* Step B: Would you like us to generate one? */}
      {hasLandingPage === false && (
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5" style={{ color: accentColor }} />
            <h3 className="font-heading text-lg font-semibold text-midnight-navy">
              Generate a Landing Page
            </h3>
          </div>
          <p className="text-sm text-slate-gray mb-4">
            Would you like us to generate a professional landing page based on
            your campaign data?
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setWantsLandingPage(true)}
              className={`flex-1 rounded-lg border-2 px-4 py-3 text-sm font-semibold transition-colors ${
                wantsLandingPage === true
                  ? "text-white"
                  : "border-slate-200 text-midnight-navy hover:border-slate-300"
              }`}
              style={
                wantsLandingPage === true
                  ? { borderColor: accentColor, backgroundColor: accentColor }
                  : undefined
              }
            >
              Yes, build me a landing page
            </button>
            <button
              type="button"
              onClick={() => setWantsLandingPage(false)}
              className={`flex-1 rounded-lg border-2 px-4 py-3 text-sm font-semibold transition-colors ${
                wantsLandingPage === false
                  ? "text-white"
                  : "border-slate-200 text-midnight-navy hover:border-slate-300"
              }`}
              style={
                wantsLandingPage === false
                  ? { borderColor: accentColor, backgroundColor: accentColor }
                  : undefined
              }
            >
              No thanks, skip this
            </button>
          </div>
        </div>
      )}

      {/* Step C: Interactive Screening Questions Selection */}
      {wantsLandingPage === true && matchedCriteria && (
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" style={{ color: accentColor }} />
              <h3 className="font-heading text-lg font-semibold text-midnight-navy">
                Qualification Screening Questions
              </h3>
            </div>
            <span className="text-xs text-slate-gray">
              {totalSelectedQuestions} selected
              {totalSelectedQuestions === 0 && (
                <span className="ml-1 text-alert font-medium">(min 1 required)</span>
              )}
            </span>
          </div>
          <p className="text-sm text-slate-gray mb-4">
            Select which questions to include on your landing page. Uncheck any you don&apos;t want.
            You can also add custom questions below.
          </p>

          {/* Prepopulated questions with checkboxes */}
          <div className="space-y-2">
            {matchedCriteria.screeningQuestions.map((q, i) => {
              const isChecked = selectedQuestionIds.has(q.id);
              return (
                <div
                  key={q.id}
                  className={`flex items-start gap-3 rounded-md border p-3 transition-colors cursor-pointer ${
                    isChecked
                      ? "border-slate-200 bg-cloud/50"
                      : "border-slate-100 bg-white opacity-60"
                  }`}
                  onClick={() => onToggleQuestion(q.id)}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleQuestion(q.id);
                    }}
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs transition-colors ${
                      isChecked
                        ? "border-intelligence-teal bg-intelligence-teal text-white"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {isChecked && <Check className="h-3 w-3" />}
                  </button>
                  <span
                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    style={{ backgroundColor: isChecked ? accentColor : "#94a3b8" }}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-midnight-navy">
                      {q.question}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-gray uppercase tracking-wider">
                        {questionTypeLabel(q.type)}
                      </span>
                      {q.disqualifyOn && q.disqualifyOn.length > 0 && (
                        <span className="rounded bg-alert/10 px-1.5 py-0.5 text-[10px] font-medium text-alert uppercase tracking-wider">
                          Disqualifies on: {q.disqualifyOn.join(", ")}
                        </span>
                      )}
                    </div>
                    {q.helpText && (
                      <p className="mt-1 text-xs text-slate-gray">{q.helpText}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Custom questions */}
          {customQuestions.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
                Custom Questions
              </p>
              {customQuestions.map((q) => {
                const isChecked = selectedQuestionIds.has(q.id);
                return (
                  <div
                    key={q.id}
                    className={`flex items-start gap-3 rounded-md border p-3 transition-all ${
                      isChecked
                        ? "border-violet-200 bg-violet-50/30"
                        : "border-slate-100 bg-white opacity-60"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onToggleQuestion(q.id)}
                      className={`mt-2 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs transition-colors ${
                        isChecked
                          ? "border-intelligence-teal bg-intelligence-teal text-white"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {isChecked && <Check className="h-3 w-3" />}
                    </button>
                    <span className="mt-2 rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-600 uppercase tracking-wider shrink-0">
                      Custom
                    </span>
                    <div className="min-w-0 flex-1 space-y-2">
                      <input
                        type="text"
                        value={q.question}
                        onChange={(e) => onUpdateCustomQuestion(q.id, { question: e.target.value })}
                        placeholder="Enter your question..."
                        className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-midnight-navy focus:border-intelligence-teal focus:outline-none focus:ring-1 focus:ring-intelligence-teal"
                      />
                      <select
                        value={q.type}
                        onChange={(e) => onUpdateCustomQuestion(q.id, { type: e.target.value as QuestionType })}
                        className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-midnight-navy focus:border-intelligence-teal focus:outline-none"
                      >
                        <option value="yes_no">Yes / No</option>
                        <option value="select">Multiple Choice</option>
                        <option value="text">Free Text</option>
                      </select>
                      {q.type === "select" && (
                        <input
                          type="text"
                          value={q.options?.join(", ") ?? ""}
                          onChange={(e) =>
                            onUpdateCustomQuestion(q.id, {
                              options: e.target.value.split(",").map((o) => o.trim()).filter(Boolean),
                            })
                          }
                          placeholder="Options (comma-separated): e.g., Option A, Option B, Option C"
                          className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-midnight-navy focus:border-intelligence-teal focus:outline-none focus:ring-1 focus:ring-intelligence-teal"
                        />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveCustomQuestion(q.id)}
                      className="mt-2 shrink-0 rounded p-1 text-slate-gray/50 hover:text-alert hover:bg-alert/10 transition-colors"
                      title="Remove question"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add custom question button */}
          <button
            type="button"
            onClick={onAddCustomQuestion}
            className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-dashed border-slate-300 px-3 py-2 text-xs font-medium text-slate-gray hover:border-intelligence-teal hover:text-intelligence-teal transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Custom Question
          </button>
        </div>
      )}

      {/* Step D: Qualification Flow Style */}
      {wantsLandingPage === true && matchedCriteria && totalSelectedQuestions > 0 && (
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5" style={{ color: accentColor }} />
            <h3 className="font-heading text-lg font-semibold text-midnight-navy">
              Qualification Flow Style
            </h3>
          </div>
          <p className="text-sm text-slate-gray mb-4">
            Choose how your {totalSelectedQuestions} selected question{totalSelectedQuestions !== 1 ? "s are" : " is"} presented on the landing page.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setQualificationStyle("multi-step");
                if (!landingPageHtml && !landingPages && !landingPageLoading) {
                  onGenerate();
                }
              }}
              className={`rounded-lg border-2 p-4 text-left transition-colors ${
                qualificationStyle === "multi-step"
                  ? "text-white"
                  : "border-slate-200 hover:border-slate-300"
              }`}
              style={
                qualificationStyle === "multi-step"
                  ? { borderColor: accentColor, backgroundColor: accentColor }
                  : undefined
              }
            >
              <p className="text-sm font-semibold">
                Multi-step form (Recommended)
              </p>
              <p className={`mt-1 text-xs ${qualificationStyle === "multi-step" ? "text-white/80" : "text-slate-gray"}`}>
                Progressive qualification with branching logic, 1-2 questions
                per screen, progress bar. Industry data shows 743% conversion
                lift vs single-page.
              </p>
            </button>
            <button
              type="button"
              onClick={() => {
                setQualificationStyle("single-page");
                if (!landingPageHtml && !landingPages && !landingPageLoading) {
                  onGenerate();
                }
              }}
              className={`rounded-lg border-2 p-4 text-left transition-colors ${
                qualificationStyle === "single-page"
                  ? "text-white"
                  : "border-slate-200 hover:border-slate-300"
              }`}
              style={
                qualificationStyle === "single-page"
                  ? { borderColor: accentColor, backgroundColor: accentColor }
                  : undefined
              }
            >
              <p className="text-sm font-semibold">Single-page checklist</p>
              <p className={`mt-1 text-xs ${qualificationStyle === "single-page" ? "text-white/80" : "text-slate-gray"}`}>
                All qualification questions on one page as a checklist/form.
                Simpler but lower conversion rates.
              </p>
            </button>
          </div>
        </div>
      )}

      {/* Step E: Multi-step form page preview with tabs */}
      {qualificationStyle === "multi-step" && formPages.length > 0 && (
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5" style={{ color: accentColor }} />
            <h3 className="font-heading text-lg font-semibold text-midnight-navy">
              Form Page Layout
            </h3>
          </div>
          <p className="text-sm text-slate-gray mb-4">
            Your {totalSelectedQuestions} question{totalSelectedQuestions !== 1 ? "s" : ""} will be
            distributed across {formPages.length - 1} page{formPages.length - 1 !== 1 ? "s" : ""} plus
            a final submit page. Click each tab to preview.
          </p>

          {/* Tab navigation — matches landing page preview tab styling */}
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1 mb-4">
            {formPages.map((page, idx) => {
              const isActive = activeFormPageTab === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveFormPageTab(idx)}
                  className={`flex-1 rounded-md px-3 py-2 text-xs font-semibold transition-colors ${
                    isActive
                      ? "bg-white text-midnight-navy shadow-sm"
                      : "text-slate-gray hover:text-midnight-navy"
                  }`}
                  style={isActive ? { borderBottom: `2px solid ${accentColor}` } : undefined}
                >
                  {page.label}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          {formPages[activeFormPageTab] && (
            <div className="rounded-lg border border-slate-200 p-4">
              {formPages[activeFormPageTab].questions.length > 0 ? (
                <div className="space-y-3">
                  {formPages[activeFormPageTab].questions.map((q, qi) => {
                    // Compute global question index from preceding pages
                    let globalIdx = 0;
                    for (let p = 0; p < activeFormPageTab; p++) {
                      globalIdx += formPages[p].questions.length;
                    }
                    globalIdx += qi;
                    return (
                      <div
                        key={q.id}
                        className="flex items-start gap-3 rounded-md border border-slate-200 bg-cloud/50 p-3"
                      >
                        <span
                          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                          style={{ backgroundColor: accentColor }}
                        >
                          {globalIdx + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-midnight-navy">
                            {q.question}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-gray uppercase tracking-wider">
                              {questionTypeLabel(q.type)}
                            </span>
                            {q.disqualifyOn && q.disqualifyOn.length > 0 && (
                              <span className="rounded bg-alert/10 px-1.5 py-0.5 text-[10px] font-medium text-alert uppercase tracking-wider">
                                Disqualifies on: {q.disqualifyOn.join(", ")}
                              </span>
                            )}
                          </div>
                          {q.helpText && (
                            <p className="mt-1 text-xs text-slate-gray">{q.helpText}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-intelligence-teal/10 mb-2">
                    <Check className="h-5 w-5 text-intelligence-teal" />
                  </div>
                  <p className="text-sm font-medium text-midnight-navy">Submit &amp; Contact Info</p>
                  <p className="text-xs text-slate-gray mt-1">
                    Qualified leads see a contact form (name, phone, email).
                    Disqualified leads see a call-to-action for a free consultation.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Step D-alt: no matching criteria — generate directly */}
      {wantsLandingPage === true && !matchedCriteria && !landingPageHtml && !landingPages && !landingPageLoading && (
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <h3 className="font-heading text-lg font-semibold text-midnight-navy">
              No Screening Questions Available
            </h3>
          </div>
          <p className="text-sm text-slate-gray mb-4">
            We don&apos;t have pre-built qualification criteria for this tort yet.
            The landing page will be generated without a qualification form.
          </p>
          <button
            type="button"
            onClick={onGenerate}
            className="rounded-md px-4 py-2.5 text-sm font-semibold text-white transition-colors"
            style={{ backgroundColor: accentColor }}
          >
            Generate Landing Page
          </button>
        </div>
      )}

      {/* Loading state */}
      {landingPageLoading && (
        <div className="rounded-lg border border-intelligence-teal/20 bg-intelligence-teal/5 p-6">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-intelligence-teal" />
            <div>
              <p className="text-sm font-semibold text-intelligence-teal">
                Generating your landing page...
              </p>
              <p className="text-xs text-intelligence-teal/70 mt-0.5">
                Building a responsive HTML page tailored to your campaign
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error state */}
      {landingPageError && !landingPageLoading && (
        <div className="rounded-lg border border-alert/20 bg-alert/5 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-alert">{landingPageError}</p>
            <button
              onClick={onGenerate}
              className="text-sm font-medium text-alert hover:text-alert/80 underline"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Preview + Download UI — Multi-page */}
      {landingPages && !landingPageLoading && (
        <div className="rounded-lg bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5" style={{ color: accentColor }} />
              <h3 className="font-heading text-lg font-semibold text-midnight-navy">
                {landingPagesTitle ?? "Generated Landing Pages"}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onGenerate}
                disabled={landingPageLoading}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-midnight-navy hover:bg-cloud transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Regenerate
              </button>
              <button
                onClick={onCopy}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-midnight-navy hover:bg-cloud transition-colors"
              >
                {copied ? (
                  <>
                    <ClipboardCheck className="h-3.5 w-3.5 text-success" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Clipboard className="h-3.5 w-3.5" />
                    Copy HTML
                  </>
                )}
              </button>
              <button
                onClick={onDownloadCurrent}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-midnight-navy hover:bg-cloud transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                Download Current
              </button>
              <button
                onClick={onDownload}
                className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold text-white transition-colors"
                style={{ backgroundColor: accentColor }}
              >
                <Download className="h-3.5 w-3.5" />
                Download All Pages
              </button>
            </div>
          </div>

          {/* Tab navigation */}
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
            {landingPages.map((page) => {
              const tabLabels: Record<string, string> = {
                landing: "Landing Page",
                qualify: "Qualification",
                "thank-you": "Thank You",
              };
              const isActive = activePageTab === page.slug;
              return (
                <button
                  key={page.slug}
                  onClick={() => setActivePageTab(page.slug)}
                  className={`flex-1 rounded-md px-3 py-2 text-xs font-semibold transition-colors ${
                    isActive
                      ? "bg-white text-midnight-navy shadow-sm"
                      : "text-slate-gray hover:text-midnight-navy"
                  }`}
                  style={isActive ? { borderBottom: `2px solid ${accentColor}` } : undefined}
                >
                  {tabLabels[page.slug] ?? page.slug}
                </button>
              );
            })}
          </div>

          {/* Iframe Preview */}
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <iframe
              srcDoc={landingPages.find((p) => p.slug === activePageTab)?.html ?? ""}
              title={landingPages.find((p) => p.slug === activePageTab)?.title ?? "Page Preview"}
              className="w-full border-0"
              style={{ height: "600px" }}
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      )}

      {/* Preview + Download UI — Single-page */}
      {landingPageHtml && !landingPages && !landingPageLoading && (
        <div className="rounded-lg bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5" style={{ color: accentColor }} />
              <h3 className="font-heading text-lg font-semibold text-midnight-navy">
                {landingPageTitle ?? "Generated Landing Page"}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onGenerate}
                disabled={landingPageLoading}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-midnight-navy hover:bg-cloud transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Regenerate
              </button>
              <button
                onClick={onCopy}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-midnight-navy hover:bg-cloud transition-colors"
              >
                {copied ? (
                  <>
                    <ClipboardCheck className="h-3.5 w-3.5 text-success" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Clipboard className="h-3.5 w-3.5" />
                    Copy HTML
                  </>
                )}
              </button>
              <button
                onClick={onDownload}
                className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold text-white transition-colors"
                style={{ backgroundColor: accentColor }}
              >
                <Download className="h-3.5 w-3.5" />
                Download HTML
              </button>
            </div>
          </div>

          {/* Iframe Preview */}
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <iframe
              srcDoc={landingPageHtml}
              title={landingPageTitle ?? "Landing Page Preview"}
              className="w-full border-0"
              style={{ height: "600px" }}
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      )}
    </div>
  );
}
