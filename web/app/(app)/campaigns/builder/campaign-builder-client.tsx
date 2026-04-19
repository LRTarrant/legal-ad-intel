"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
  Palette,
  Mic,
  Volume2,
  Info,
} from "lucide-react";
import { downloadCampaignZip } from "@/lib/campaign-export";
import { LogoUpload } from "./logo-upload";
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

/* ── Radio / Voice Types ───────────────────────────────────────────────── */

interface VoiceRecommendation {
  gender: "male" | "female";
  style: string;
  reason: string;
}

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  labels?: Record<string, string>;
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

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/* ── Component ──────────────────────────────────────────────────────────── */

export function CampaignBuilderClient() {
  const tenant = useTenant();
  const accentColor = tenant.accentColor ?? "#1A8C96";

  // Form state
  const [tortNames, setTortNames] = useState<string[]>([]);
  const [selectedTort, setSelectedTort] = useState("");
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [monthlyBudget, setMonthlyBudget] = useState("");
  const [firmName, setFirmName] = useState("");
  const [firmUrl, setFirmUrl] = useState("");
  const [firmUrlError, setFirmUrlError] = useState<string | null>(null);
  const [stateDropdownOpen, setStateDropdownOpen] = useState(false);
  const [stateSearch, setStateSearch] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

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
  const [landingPageLoading, setLandingPageLoading] = useState(false);
  const [landingPageError, setLandingPageError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Qualification flow state
  const [qualificationStyle, setQualificationStyle] = useState<"multi-step" | "single-page" | null>(null);

  // Feature 1: Selectable + custom criteria questions
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());
  const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>([]);

  // Feature 2: Brand scraping
  const [brandColors, setBrandColors] = useState<BrandColors>({ primary: null, secondary: null, accent: null });
  const [brandScraping, setBrandScraping] = useState(false);
  const [brandScraped, setBrandScraped] = useState(false);
  const brandScrapeAbort = useRef<AbortController | null>(null);

  // Feature 3: AI creative images
  const [aiCreativeEnabled, setAiCreativeEnabled] = useState(false);
  const [creativeImages, setCreativeImages] = useState<(string | null)[]>([null, null, null]);
  const [creativeLoading, setCreativeLoading] = useState<boolean[]>([false, false, false]);

  // Radio spot state
  const [radioScript, setRadioScript] = useState<string | null>(null);
  const [radioLoading, setRadioLoading] = useState(false);
  const [radioError, setRadioError] = useState<string | null>(null);
  const [radioDuration, setRadioDuration] = useState<30 | 60>(30);
  const [voiceRecommendation, setVoiceRecommendation] = useState<VoiceRecommendation | null>(null);
  const [voices, setVoices] = useState<ElevenLabsVoice[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>("");
  const [voiceAutoSelected, setVoiceAutoSelected] = useState(false);

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
        firm_url: firmUrl.trim() || undefined,
        plan_data: {
          tort_overview: plan.tort_overview,
          geo_recommendations: plan.geo_recommendations,
          channel_mix: plan.channel_mix,
          budget_projection: plan.budget_projection,
        },
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

  // Feature 2: Brand scraping
  const scrapeBrand = useCallback(
    async (url: string) => {
      if (!url || !isValidUrl(url)) return;
      brandScrapeAbort.current?.abort();
      const controller = new AbortController();
      brandScrapeAbort.current = controller;

      setBrandScraping(true);
      setBrandScraped(false);
      try {
        const res = await fetch("/api/campaigns/scrape-brand", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = await res.json();
        if (controller.signal.aborted) return;

        if (data.logoUrl && !logoUrl) {
          setLogoUrl(data.logoUrl);
        }
        setBrandColors({
          primary: data.primaryColor ?? null,
          secondary: data.secondaryColor ?? null,
          accent: data.accentColor ?? null,
        });
        setBrandScraped(true);
      } catch {
        // Silently fail — brand scraping is best-effort
      } finally {
        if (!controller.signal.aborted) {
          setBrandScraping(false);
        }
      }
    },
    [logoUrl],
  );

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

  // Fetch ElevenLabs voice list once on mount
  useEffect(() => {
    async function fetchVoices() {
      try {
        const res = await fetch("https://api.elevenlabs.io/v1/voices", {
          headers: {
            "xi-api-key": process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY ?? "",
          },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.voices) {
          setVoices(data.voices as ElevenLabsVoice[]);
        }
      } catch {
        // Voice list fetch is best-effort
      }
    }
    fetchVoices();
  }, []);

  // Auto-select voice when recommendation arrives
  useEffect(() => {
    if (!voiceRecommendation || voices.length === 0) return;

    const genderMatch = voices.filter(
      (v) =>
        v.labels?.gender?.toLowerCase() === voiceRecommendation.gender,
    );

    // Try to find a voice whose use_case or description matches the style
    const styleLower = voiceRecommendation.style.toLowerCase();
    const styleMatch = genderMatch.find((v) => {
      const useCase = (v.labels?.use_case ?? "").toLowerCase();
      const desc = (v.labels?.description ?? "").toLowerCase();
      const accent = (v.labels?.accent ?? "").toLowerCase();
      const combined = `${useCase} ${desc} ${accent}`;
      return styleLower.split(/\s+/).some((word) => combined.includes(word));
    });

    const bestMatch = styleMatch ?? genderMatch[0];
    if (bestMatch) {
      setSelectedVoiceId(bestMatch.voice_id);
      setVoiceAutoSelected(true);
    }
  }, [voiceRecommendation, voices]);

  async function generateRadioScript() {
    if (!selectedTort || selectedStates.length === 0 || !firmName.trim()) return;
    setRadioLoading(true);
    setRadioError(null);
    setRadioScript(null);
    setVoiceRecommendation(null);
    setVoiceAutoSelected(false);

    try {
      const res = await fetch("/api/campaigns/generate-radio-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          duration: radioDuration,
          tort_name: selectedTort,
          firm_name: firmName.trim(),
          firm_url: firmUrl.trim() || undefined,
          states: selectedStates,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }

      const data = await res.json();
      setRadioScript(data.script);

      if (data.voice_recommendation) {
        setVoiceRecommendation(data.voice_recommendation as VoiceRecommendation);
      }
    } catch (err) {
      setRadioError(
        err instanceof Error ? err.message : "Failed to generate radio script",
      );
    } finally {
      setRadioLoading(false);
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
    setRadioScript(null);
    setRadioLoading(false);
    setRadioError(null);
    setVoiceRecommendation(null);
    setVoiceAutoSelected(false);

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
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }

      const data: CampaignPlan = await res.json();
      setPlan(data);
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

    try {
      const res = await fetch("/api/campaigns/generate-landing-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tort_name: selectedTort,
          states: selectedStates,
          firm_name: firmName.trim() || undefined,
          firm_url: firmUrl.trim() || undefined,
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
          logo_url: logoUrl ?? undefined,
          qualification_style: qualificationStyle ?? undefined,
          screening_questions: selectedScreeningQuestions.length > 0 ? selectedScreeningQuestions : undefined,
          disqualify_message: matchedCriteria?.disqualifyMessage ?? undefined,
          qualify_message: matchedCriteria?.qualifyMessage ?? undefined,
          brand_colors: (brandColors.primary || brandColors.secondary || brandColors.accent) ? brandColors : undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }

      const data: { html: string; title: string } = await res.json();
      setLandingPageHtml(data.html);
      setLandingPageTitle(data.title);
    } catch (err) {
      setLandingPageError(
        err instanceof Error ? err.message : "Failed to generate landing page",
      );
    } finally {
      setLandingPageLoading(false);
    }
  }

  function downloadLandingPage() {
    if (!landingPageHtml) return;
    const blob = new Blob([landingPageHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${landingPageTitle?.replace(/[^a-zA-Z0-9-_ ]/g, "").replace(/\s+/g, "-").toLowerCase() ?? "landing-page"}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function copyLandingPageHtml() {
    if (!landingPageHtml) return;
    await navigator.clipboard.writeText(landingPageHtml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const canGenerate = selectedTort && selectedStates.length > 0 && firmName.trim() !== "" && !firmUrlError && !loading;
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
      {/* Input Panel */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="font-heading text-lg font-semibold text-midnight-navy mb-4">
          Configure Your Campaign
        </h2>
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

          {/* Website URL */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1.5">
              Website URL (optional)
            </label>
            <div className="relative">
              <input
                type="url"
                value={firmUrl}
                onChange={(e) => {
                  setFirmUrl(e.target.value);
                  if (e.target.value && !isValidUrl(e.target.value)) {
                    setFirmUrlError("Enter a valid URL (e.g., https://www.smithlaw.com)");
                  } else {
                    setFirmUrlError(null);
                  }
                }}
                onBlur={(e) => {
                  const val = e.target.value.trim();
                  if (val && isValidUrl(val) && !brandScraped) {
                    scrapeBrand(val);
                  }
                }}
                placeholder="e.g., https://www.smithlaw.com"
                className={`w-full rounded-md border bg-white px-3 py-2.5 text-sm text-midnight-navy focus:outline-none focus:ring-1 ${
                  firmUrlError
                    ? "border-alert focus:border-alert focus:ring-alert"
                    : "border-slate-200 focus:border-intelligence-teal focus:ring-intelligence-teal"
                }`}
              />
              {brandScraping && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-intelligence-teal" />
                  <span className="text-[10px] text-intelligence-teal font-medium">Detecting brand...</span>
                </div>
              )}
            </div>
            {firmUrlError && (
              <p className="mt-1 text-xs text-alert">{firmUrlError}</p>
            )}
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

        {/* Logo Upload + Brand Colors */}
        <div className="mt-4 border-t border-slate-100 pt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <LogoUpload logoUrl={logoUrl} onLogoChange={setLogoUrl} accentColor={accentColor} />

            {/* Brand Colors (from scrape or manual) */}
            {brandScraped && (brandColors.primary || brandColors.secondary || brandColors.accent) && (
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Palette className="h-3.5 w-3.5" />
                    Detected Brand Colors
                  </span>
                </label>
                <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
                  {[
                    { label: "Primary", color: brandColors.primary },
                    { label: "Secondary", color: brandColors.secondary },
                    { label: "Accent", color: brandColors.accent },
                  ]
                    .filter((c) => c.color)
                    .map((c) => (
                      <div key={c.label} className="flex items-center gap-2">
                        <div
                          className="h-8 w-8 rounded-md border border-slate-200 shadow-sm"
                          style={{ backgroundColor: c.color! }}
                          title={`${c.label}: ${c.color}`}
                        />
                        <div>
                          <p className="text-[10px] text-slate-gray uppercase tracking-wider">{c.label}</p>
                          <p className="text-xs font-mono text-midnight-navy">{c.color}</p>
                        </div>
                      </div>
                    ))}
                </div>
                <p className="text-[10px] text-slate-gray">
                  Colors will be used in landing page design and ad creatives
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

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
                  Uses DALL-E 3 to generate background images for ad creatives (~$0.12 for 3 images). Gradient mockups are used as fallback.
                </p>
              </div>

              <AiAdCopyCard
                adCopy={aiInsights.ad_copy}
                tortName={selectedTort}
                logoUrl={logoUrl}
                firmName={firmName.trim()}
                firmUrl={firmUrl.trim()}
                brandColors={brandColors}
                aiCreativeEnabled={aiCreativeEnabled}
                creativeImages={creativeImages}
                creativeLoading={creativeLoading}
                onRegenerateImage={generateCreativeImage}
              />
              <AiIntelligenceComplianceCard insights={aiInsights} />
            </div>
          )}

          {/* Radio Spot Section — shown after AI insights load or error */}
          {(aiInsights || aiError) && !aiLoading && (
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Mic className="h-5 w-5" style={{ color: accentColor }} />
                <h3 className="font-heading text-lg font-semibold text-midnight-navy">
                  Radio Spot Generator
                </h3>
              </div>

              <div className="flex flex-wrap items-end gap-4 mb-4">
                {/* Duration selector */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1.5">
                    Duration
                  </label>
                  <div className="flex gap-2">
                    {([30, 60] as const).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setRadioDuration(d)}
                        className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                          radioDuration === d
                            ? "text-white"
                            : "border-slate-200 text-midnight-navy hover:border-slate-300"
                        }`}
                        style={
                          radioDuration === d
                            ? { backgroundColor: accentColor, borderColor: accentColor }
                            : undefined
                        }
                      >
                        {d}s
                      </button>
                    ))}
                  </div>
                </div>

                {/* Voice dropdown */}
                {voices.length > 0 && (
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1.5">
                      Voice
                    </label>
                    <select
                      value={selectedVoiceId}
                      onChange={(e) => {
                        setSelectedVoiceId(e.target.value);
                        setVoiceAutoSelected(false);
                      }}
                      className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-midnight-navy focus:border-intelligence-teal focus:outline-none focus:ring-1 focus:ring-intelligence-teal"
                    >
                      <option value="">Select a voice...</option>
                      {voices.map((v) => (
                        <option key={v.voice_id} value={v.voice_id}>
                          {v.name}
                          {v.labels?.gender ? ` (${v.labels.gender})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Generate button */}
                <button
                  type="button"
                  onClick={generateRadioScript}
                  disabled={radioLoading || !selectedTort || !firmName.trim()}
                  className={`rounded-md px-5 py-2 text-sm font-semibold text-white transition-colors ${
                    radioLoading || !selectedTort || !firmName.trim()
                      ? "bg-slate-300 cursor-not-allowed"
                      : ""
                  }`}
                  style={
                    !radioLoading && selectedTort && firmName.trim()
                      ? { backgroundColor: accentColor }
                      : undefined
                  }
                >
                  {radioLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Volume2 className="h-4 w-4" />
                      Generate Script
                    </span>
                  )}
                </button>
              </div>

              {/* Voice recommendation badge */}
              {voiceRecommendation && (
                <div className="mb-4 flex items-start gap-2 rounded-md border border-violet-200 bg-violet-50/50 p-3">
                  <Info className="h-4 w-4 text-violet-500 mt-0.5 shrink-0" />
                  <div className="text-sm text-midnight-navy">
                    <span className="font-semibold">Recommended: </span>
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
                      style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
                    >
                      {voiceRecommendation.gender === "female" ? "Female" : "Male"} voice — {voiceRecommendation.style}
                    </span>
                    <span className="ml-1.5 text-xs text-slate-gray">
                      — {voiceRecommendation.reason}
                    </span>
                    {voiceAutoSelected && (
                      <span className="ml-2 text-[10px] text-violet-500 font-medium">
                        (auto-selected)
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Error */}
              {radioError && !radioLoading && (
                <div className="mb-4 rounded-md border border-alert/20 bg-alert/5 p-3 text-sm text-alert">
                  {radioError}
                </div>
              )}

              {/* Script output */}
              {radioScript && !radioLoading && (
                <div className="rounded-md border border-slate-200 bg-cloud p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-2">
                    {radioDuration}s Radio Script
                  </p>
                  <div className="text-sm leading-relaxed text-midnight-navy whitespace-pre-line">
                    {radioScript}
                  </div>
                </div>
              )}
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
              landingPageHtml={landingPageHtml}
              landingPageTitle={landingPageTitle}
              landingPageLoading={landingPageLoading}
              landingPageError={landingPageError}
              copied={copied}
              onGenerate={generateLandingPage}
              onDownload={downloadLandingPage}
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
  logoUrl,
  firmName,
  aiImageUrl,
  isLoading,
  onRegenerate,
  brandColors,
}: {
  headline: string;
  tortName: string;
  variantIndex: number;
  logoUrl?: string | null;
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
          ? { backgroundImage: `url(${aiImageUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
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
      {logoUrl && !onRegenerate && (
        <div className="absolute top-3 right-3 z-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl}
            alt="Brand logo"
            className="h-8 w-auto max-w-[72px] object-contain drop-shadow-md"
          />
        </div>
      )}
      {logoUrl && onRegenerate && (
        <div className="absolute top-2 right-10 z-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl}
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
  logoUrl,
  firmName,
  firmUrl,
  brandColors,
  aiCreativeEnabled,
  creativeImages,
  creativeLoading,
  onRegenerateImage,
}: {
  adCopy: AiInsights["ad_copy"];
  tortName: string;
  logoUrl?: string | null;
  firmName?: string;
  firmUrl?: string;
  brandColors?: BrandColors;
  aiCreativeEnabled?: boolean;
  creativeImages?: (string | null)[];
  creativeLoading?: boolean[];
  onRegenerateImage?: (index: number) => void;
}) {
  const displayUrl = firmUrl
    ? firmUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")
    : "www.example.com/legal";
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
                  logoUrl={logoUrl}
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
  landingPageHtml,
  landingPageTitle,
  landingPageLoading,
  landingPageError,
  copied,
  onGenerate,
  onDownload,
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
  landingPageHtml: string | null;
  landingPageTitle: string | null;
  landingPageLoading: boolean;
  landingPageError: string | null;
  copied: boolean;
  onGenerate: () => void;
  onDownload: () => void;
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
                if (!landingPageHtml && !landingPageLoading) {
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
                if (!landingPageHtml && !landingPageLoading) {
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

      {/* Step D-alt: no matching criteria — generate directly */}
      {wantsLandingPage === true && !matchedCriteria && !landingPageHtml && !landingPageLoading && (
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

      {/* Preview + Download UI */}
      {landingPageHtml && !landingPageLoading && (
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
