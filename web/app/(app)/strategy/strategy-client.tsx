"use client";

/**
 * Strategy Engine — interview + result.
 *
 * "The Analyst's Brief": a navy intelligence rail (a live brief that mirrors the
 * user's picks + a deliverables list that reorders to them) beside a calm carded
 * form with a sticky generate bar. The interview POSTs to /api/strategy/generate,
 * which re-assembles inputs server-side; the returned Strategy renders in
 * <StrategyDeck/> below the panel (auto-scrolled into view). Field values stay in
 * the backend's slug vocabulary (trucking, paid_search, 25k_75k, …); display
 * labels + icons are looked up only for the UI. Reduced-motion safe.
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import {
  Anchor,
  ArrowLeft,
  ArrowRight,
  Bike,
  Car,
  Check,
  ChevronDown,
  HardHat,
  HeartPulse,
  Loader2,
  MapPin,
  PhoneCall,
  RadioTower,
  RefreshCw,
  TriangleAlert,
  Truck,
  UserRound,
  Wallet,
} from "lucide-react";
import StrategyDeck from "./strategy-deck";

type Voice = "firm" | "agency" | "seller";
type LucideIcon = ComponentType<{ size?: number | string; className?: string; style?: React.CSSProperties }>;

interface DmaOption {
  dma_code: string;
  display_name: string;
}

const AUDIENCES: { key: Voice; label: string }[] = [
  { key: "agency", label: "Agency" },
  { key: "firm", label: "Law firm" },
  { key: "seller", label: "Media seller" },
];

const CASE_TYPES = ["trucking", "auto", "motorcycle", "nursing_home", "workers_comp", "boating"];
const CASE_META: Record<string, { label: string; Icon: LucideIcon }> = {
  trucking: { label: "Trucking", Icon: Truck },
  auto: { label: "Auto", Icon: Car },
  motorcycle: { label: "Motorcycle", Icon: Bike },
  nursing_home: { label: "Nursing Home", Icon: HeartPulse },
  workers_comp: { label: "Workers Comp", Icon: HardHat },
  boating: { label: "Boating", Icon: Anchor },
};

const BUDGET_TIERS = [
  { key: "under_10k", label: "Under $10K/mo", range: "<$10K" },
  { key: "10k_25k", label: "$10K–$25K/mo", range: "$10–25K" },
  { key: "25k_75k", label: "$25K–$75K/mo", range: "$25–75K" },
  { key: "75k_plus", label: "$75K+/mo", range: "$75K+" },
];

const GOALS = ["More qualified signups", "Lower cost per case", "Brand awareness", "Enter a new market", "Defend share"];

const LOADING_STAGE_COUNT = 4;

const CHANNELS: { key: string; label: string }[] = [
  { key: "paid_search", label: "Paid Search" },
  { key: "broadcast_tv", label: "Broadcast TV" },
  { key: "billboards", label: "Billboards" },
  { key: "radio", label: "Radio" },
  { key: "social", label: "Social" },
  { key: "ctv", label: "CTV" },
];

const INTAKE_OPTIONS = [
  { key: "steady", label: "Steady flow" },
  { key: "scale", label: "Can scale up" },
  { key: "high", label: "High capacity" },
];

const READINESS = [
  { key: "landing_pages", label: "Dedicated landing pages for paid traffic?" },
  { key: "tracking", label: "Call + conversion tracking in place?" },
  { key: "intake", label: "Intake calls leads back within minutes?" },
  { key: "web_presence", label: "Site + claimed Google Business Profile?" },
];
const READINESS_ANSWERS: { v: "yes" | "no" | "unsure"; label: string; dot: string }[] = [
  { v: "yes", label: "Yes", dot: "var(--color-success)" },
  { v: "no", label: "No", dot: "var(--color-alert)" },
  { v: "unsure", label: "Unsure", dot: "var(--color-slate-gray)" },
];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
];
const STATE_NAMES: Record<string, string> = {
  AL:"Alabama", AK:"Alaska", AZ:"Arizona", AR:"Arkansas", CA:"California", CO:"Colorado", CT:"Connecticut",
  DE:"Delaware", FL:"Florida", GA:"Georgia", HI:"Hawaii", ID:"Idaho", IL:"Illinois", IN:"Indiana", IA:"Iowa",
  KS:"Kansas", KY:"Kentucky", LA:"Louisiana", ME:"Maine", MD:"Maryland", MA:"Massachusetts", MI:"Michigan",
  MN:"Minnesota", MS:"Mississippi", MO:"Missouri", MT:"Montana", NE:"Nebraska", NV:"Nevada", NH:"New Hampshire",
  NJ:"New Jersey", NM:"New Mexico", NY:"New York", NC:"North Carolina", ND:"North Dakota", OH:"Ohio",
  OK:"Oklahoma", OR:"Oregon", PA:"Pennsylvania", RI:"Rhode Island", SC:"South Carolina", SD:"South Dakota",
  TN:"Tennessee", TX:"Texas", UT:"Utah", VT:"Vermont", VA:"Virginia", WA:"Washington", WV:"West Virginia",
  WI:"Wisconsin", WY:"Wyoming", DC:"District of Columbia",
};

const EYEBROW: React.CSSProperties = {
  fontFamily: "var(--font-heading)",
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.16em",
};

// ── Live brief — updates instantly with the user's picks (teal = dynamic) ────
function Brief({ segments }: { segments: { t: string; teal?: boolean }[] }) {
  return (
    <span>
      {segments.map((s, i) => (
        <span key={i} style={s.teal ? { color: "var(--color-light-teal)", fontWeight: 600 } : undefined}>
          {s.t}
        </span>
      ))}
    </span>
  );
}

// ── Deliverables list that FLIP-animates into its new order ──
interface Deliverable {
  key: string;
  label: string;
}
function Deliverables({ items, anyPicked }: { items: Deliverable[]; anyPicked: boolean }) {
  const refs = useRef<Record<string, HTMLDivElement | null>>({});
  const prevTop = useRef<Record<string, number>>({});
  useLayoutEffect(() => {
    items.forEach((it) => {
      const el = refs.current[it.key];
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      const p = prevTop.current[it.key];
      const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (p != null && Math.abs(p - top) > 0.5 && !reduce) {
        el.animate([{ transform: `translateY(${p - top}px)` }, { transform: "translateY(0)" }], {
          duration: 460,
          easing: "cubic-bezier(.16,.8,.3,1)",
        });
      }
      prevTop.current[it.key] = top;
    });
  });
  return (
    <div style={{ marginTop: 14, display: "grid", gap: 7 }}>
      {items.map((d, idx) => {
        const primary = anyPicked && idx === 0;
        const Glyph = primary ? ArrowRight : Check;
        return (
          <div
            key={d.key}
            ref={(el) => {
              refs.current[d.key] = el;
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 11,
              padding: "9px 12px",
              borderRadius: 10,
              background: primary ? "rgba(79,184,196,.12)" : "transparent",
              border: primary ? "1px solid rgba(79,184,196,.32)" : "1px solid transparent",
              transition: "background 300ms, border-color 300ms",
            }}
          >
            <Glyph size={15} style={{ flexShrink: 0, color: primary ? "var(--color-light-teal)" : "rgba(255,255,255,.5)" }} />
            <span style={{ fontSize: 13.5, lineHeight: 1.4, color: primary ? "#fff" : "rgba(255,255,255,.78)", fontWeight: primary ? 600 : 400 }}>
              {d.label}
            </span>
            {primary && (
              <span style={{ marginLeft: "auto", fontFamily: "var(--font-heading)", fontSize: 9.5, fontWeight: 700, letterSpacing: "0.12em", color: "var(--color-light-teal)", textTransform: "uppercase", flexShrink: 0 }}>
                Top focus
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Primitive: pill / chip toggle ────────────────────────────
function Pill({
  active,
  onClick,
  children,
  Icon,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  Icon?: LucideIcon;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="lmi-focus"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 16px",
        borderRadius: 9999,
        cursor: "pointer",
        fontFamily: "var(--font-sans)",
        fontSize: 14,
        fontWeight: 500,
        lineHeight: 1,
        userSelect: "none",
        whiteSpace: "nowrap",
        transition: "all 160ms var(--ease-standard)",
        border: "1px solid",
        background: active ? "var(--color-intelligence-teal)" : "#fff",
        color: active ? "#fff" : "var(--color-charcoal)",
        borderColor: active ? "var(--color-intelligence-teal)" : "var(--color-slate-200)",
        boxShadow: active ? "0 1px 2px rgba(11,29,58,.18)" : "none",
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.borderColor = "var(--color-intelligence-teal)";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.borderColor = "var(--color-slate-200)";
      }}
    >
      {Icon && <Icon size={15} style={{ opacity: active ? 1 : 0.55 }} />}
      {children}
      {active && <Check size={14} style={{ marginLeft: 2 }} />}
    </button>
  );
}

// ── Primitive: field block (label + optional helper) ─────────
function FieldBlock({
  label,
  helper,
  children,
  required,
}: {
  label: string;
  helper?: string;
  children?: ReactNode;
  required?: boolean;
}) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <span style={{ fontFamily: "var(--font-heading)", fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--color-midnight-navy)" }}>
          {label}
        </span>
        {!required && <span style={{ fontSize: 12, color: "var(--color-slate-gray)", fontStyle: "italic" }}>optional</span>}
        {helper && <span style={{ fontSize: 13, color: "var(--color-slate-gray)", marginLeft: "auto" }}>{helper}</span>}
      </div>
      {children}
    </div>
  );
}

const Row = ({ children }: { children: ReactNode }) => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>{children}</div>
);

// ── Primitive: styled select ─────────────────────────────────
function SelectField({
  value,
  onChange,
  options,
  render,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  render?: (label: string) => string;
}) {
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="lmi-focus"
        style={{
          appearance: "none",
          WebkitAppearance: "none",
          background: "#fff",
          border: "1px solid var(--color-slate-200)",
          borderRadius: 8,
          padding: "11px 40px 11px 14px",
          fontFamily: "var(--font-sans)",
          fontSize: 14,
          fontWeight: 500,
          color: "var(--color-charcoal)",
          cursor: "pointer",
          minWidth: 220,
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {render ? render(o.label) : o.label}
          </option>
        ))}
      </select>
      <ChevronDown size={16} style={{ position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)", color: "var(--color-slate-gray)", pointerEvents: "none" }} />
    </div>
  );
}

// ── Primitive: textarea ──────────────────────────────────────
function TextArea({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={3}
      style={{
        width: "100%",
        resize: "vertical",
        background: "#fff",
        border: "1px solid var(--color-slate-200)",
        borderRadius: 10,
        padding: "13px 15px",
        fontFamily: "var(--font-sans)",
        fontSize: 14.5,
        lineHeight: 1.55,
        color: "var(--color-charcoal)",
      }}
      onFocus={(e) => (e.target.style.borderColor = "var(--color-intelligence-teal)")}
      onBlur={(e) => (e.target.style.borderColor = "var(--color-slate-200)")}
    />
  );
}

// ── Primitive: foundation Yes/No/Unsure row ──────────────────
function FoundationRow({ q, value, onSet }: { q: string; value?: string; onSet: (v: string) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 0", borderBottom: "1px solid var(--color-slate-200)", flexWrap: "wrap" }}>
      <span style={{ fontSize: 14.5, color: "var(--color-charcoal)", flex: "1 1 220px", lineHeight: 1.4 }}>{q}</span>
      <div style={{ display: "flex", gap: 6 }}>
        {READINESS_ANSWERS.map((o) => {
          const on = value === o.v;
          return (
            <button
              key={o.v}
              type="button"
              onClick={() => onSet(o.v)}
              className="lmi-focus"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 13px",
                borderRadius: 9999,
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                fontWeight: 500,
                border: "1px solid",
                transition: "all 150ms",
                background: on ? "var(--color-midnight-navy)" : "#fff",
                color: on ? "#fff" : "var(--color-slate-gray)",
                borderColor: on ? "var(--color-midnight-navy)" : "var(--color-slate-200)",
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: 9999, background: o.dot, boxShadow: on ? "0 0 0 2px rgba(255,255,255,.25)" : "none" }} />
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface StrategyClientProps {
  /** Pre-selected state (2-letter code), e.g. from a state-page CTA. Validated against US_STATES. */
  initialState?: string;
  /** Pre-selected case types, validated against CASE_TYPES. */
  initialCaseTypes?: string[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function StrategyClient({ initialState, initialCaseTypes }: StrategyClientProps = {}) {
  const seededState = initialState && US_STATES.includes(initialState) ? initialState : "AL";
  const seededCaseTypes = (initialCaseTypes ?? []).filter((c) => CASE_TYPES.includes(c));

  const [audience, setAudience] = useState<Voice>("agency");
  const [caseTypes, setCaseTypes] = useState<string[]>(seededCaseTypes.length > 0 ? seededCaseTypes : ["trucking"]);
  const [stateCode, setStateCode] = useState(seededState);
  const [dmaCode, setDmaCode] = useState<string>("");
  const [dmaOptions, setDmaOptions] = useState<DmaOption[]>([]);
  const [budgetTier, setBudgetTier] = useState("25k_75k");
  const [goal, setGoal] = useState(GOALS[0]);
  const [existingChannels, setExistingChannels] = useState<string[]>(["paid_search", "billboards"]);
  const [intakeCapacity, setIntakeCapacity] = useState("scale");
  const [goalContext, setGoalContext] = useState("");
  const [currentAdNotes, setCurrentAdNotes] = useState("");
  const [readiness, setReadiness] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);
  const deckRef = useRef<HTMLDivElement>(null);

  // Reset the market when the state changes (a DMA from another state must not
  // ride along), then fetch the new state's DMA list.
  const onStateChange = (v: string) => {
    setStateCode(v);
    setDmaCode("");
  };

  useEffect(() => {
    let active = true;
    fetch(`/api/dma-markets?state=${stateCode}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => {
        if (active) setDmaOptions(Array.isArray(d) ? d : (d?.markets ?? []));
      })
      .catch(() => active && setDmaOptions([]));
    return () => {
      active = false;
    };
  }, [stateCode]);

  const toggle = (arr: string[], v: string, set: (a: string[]) => void) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const generate = useCallback(async () => {
    setLoading(true);
    setLoadingStage(0);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/strategy/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audience,
          case_types: caseTypes,
          state: stateCode,
          dma_code: dmaCode || null,
          county_fips: null,
          budget_tier: budgetTier,
          goal,
          existing_channels: existingChannels,
          intake_capacity: intakeCapacity,
          goal_context: goalContext,
          current_advertising_notes: currentAdNotes || undefined,
          readiness,
        }),
      });
      const data = await res.json();
      if (!res.ok) setError(data?.error ?? "Something went wrong building the strategy. Please try again.");
      else setResult(data);
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [audience, caseTypes, stateCode, dmaCode, budgetTier, goal, existingChannels, intakeCapacity, goalContext, currentAdNotes, readiness]);

  // ── Derived display values ─────────────────────────────────
  const stateLabel = STATE_NAMES[stateCode] ?? stateCode;
  const selectedMarket = dmaOptions.find((d) => d.dma_code === dmaCode)?.display_name ?? "";
  const audienceLabel = AUDIENCES.find((a) => a.key === audience)?.label ?? "";
  const budgetLabel = BUDGET_TIERS.find((b) => b.key === budgetTier)?.label ?? "";
  const intakeLabel = INTAKE_OPTIONS.find((o) => o.key === intakeCapacity)?.label ?? "";
  const caseLabel = (slug?: string) => (slug ? CASE_META[slug]?.label ?? slug : "");

  // Staged status for the ~30s generate so a long wait never reads as frozen.
  const loadingStages = [
    `Pulling ${selectedMarket || stateLabel} ad activity…`,
    "Scoring the tactic mix…",
    "Writing your brief…",
    "Putting the deck together…",
  ];
  useEffect(() => {
    if (!loading) return;
    const id = setInterval(() => {
      setLoadingStage((s) => Math.min(s + 1, LOADING_STAGE_COUNT - 1));
    }, 3500);
    return () => clearInterval(id);
  }, [loading]);

  // Bring the freshly generated deck into view.
  useEffect(() => {
    if (!result || !deckRef.current) return;
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    deckRef.current.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }, [result]);

  const foundationDone = Object.values(readiness).filter(Boolean).length === READINESS.length;
  const checks = [
    !!audience,
    caseTypes.length > 0,
    !!stateCode,
    !!budgetTier,
    !!goal,
    !!intakeCapacity,
    foundationDone,
    goalContext.trim() !== "",
  ];
  const done = checks.filter(Boolean).length;
  const total = checks.length;
  const pct = Math.round((done / total) * 100);
  const anyPicked = done > 1;
  const canSubmit = caseTypes.length > 0 && !!intakeCapacity && goalContext.trim() !== "";

  const caseStr =
    caseTypes.length === 0
      ? "your case types"
      : caseTypes.length <= 2
        ? caseTypes.map(caseLabel).join(" & ")
        : `${caseTypes.length} case types`;

  const marketSuffix = selectedMarket ? " · " + selectedMarket.split(" (")[0] : "";
  const briefSegments = [
    { t: "Build a strategy for " },
    { t: caseStr, teal: true },
    { t: " in " },
    { t: stateLabel + marketSuffix, teal: true },
    ...(budgetTier ? [{ t: " at " }, { t: budgetLabel, teal: true }] : []),
    ...(goal ? [{ t: ", optimized for " }, { t: goal.toLowerCase(), teal: true }] : []),
    { t: "." },
  ];

  const briefChips = [
    audienceLabel && { Icon: UserRound, v: audienceLabel },
    { Icon: MapPin, v: stateLabel + (selectedMarket ? "" : " · statewide") },
    budgetLabel && { Icon: Wallet, v: budgetLabel },
    intakeLabel && { Icon: PhoneCall, v: intakeLabel },
    existingChannels.length > 0 && {
      Icon: RadioTower,
      v: existingChannels.length + " channel" + (existingChannels.length > 1 ? "s" : "") + " running",
    },
  ].filter(Boolean) as { Icon: LucideIcon; v: string }[];

  const dels: Deliverable[] = [
    { key: "mix", label: "Recommended media mix by channel & flight", score: 2 + (existingChannels.length ? 2 : 0) + (budgetTier ? 1 : 0) + (goal === "More qualified signups" ? 2 : 0) },
    { key: "cpc", label: "Realistic cost per signed case for " + (caseLabel(caseTypes[0]) || "your tort"), score: 2 + (goal === "Lower cost per case" ? 4 : 0) + (budgetTier ? 1 : 0) },
    { key: "comp", label: "Where competitors are over- and under-spending", score: 2 + (goal === "Defend share" || goal === "Enter a new market" ? 4 : 0) + (audience === "agency" ? 2 : 0) },
    { key: "sat", label: "Saturation & opportunity read for " + stateLabel, score: 2 + (goal === "Brand awareness" || goal === "Enter a new market" ? 3 : 0) + (caseTypes.length > 1 ? 1 : 0) },
  ]
    .map((d, idx) => ({ ...d, idx }))
    .sort((a, b) => b.score - a.score || a.idx - b.idx);

  const railCard: React.CSSProperties = {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 14,
  };

  // Short, capped entrance stagger (quiet, not an orchestrated page-load).
  const riseStyle = (i: number): React.CSSProperties => ({ animationDelay: `${Math.min(i, 8) * 45}ms` });

  return (
    <div>
      <div
        style={{
          display: "flex",
          minHeight: "calc(100vh - 6rem)",
          borderRadius: 20,
          border: "1px solid var(--color-slate-200)",
          background: "#fff",
          boxShadow: "0 10px 30px -12px rgba(11,29,58,.22)",
        }}
        className="flex-col lg:flex-row"
      >
        {/* ───────────── LEFT — navy intelligence rail ───────────── */}
        <aside
          className="no-scrollbar rounded-t-[20px] lg:rounded-t-none lg:rounded-l-[20px] w-full lg:w-[42%] lg:max-w-[560px]"
          style={{
            position: "relative",
            flexShrink: 0,
            color: "#fff",
            background: "linear-gradient(158deg, var(--color-midnight-navy) 0%, var(--color-navy-700) 52%, var(--color-navy-600) 100%)",
          }}
        >
          {/* atmosphere: teal glow + dot grid */}
          <div
            className="rounded-t-[20px] lg:rounded-t-none lg:rounded-l-[20px]"
            style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(115% 75% at 0% -5%, rgba(79,184,196,.18), transparent 55%)" }}
          />
          <div
            className="rounded-t-[20px] lg:rounded-t-none lg:rounded-l-[20px]"
            style={{ position: "absolute", inset: 0, opacity: 0.05, pointerEvents: "none", backgroundImage: "radial-gradient(rgba(255,255,255,.9) 1px, transparent 1px)", backgroundSize: "22px 22px" }}
          />

          <div
            className="lg:sticky lg:top-6 px-7 py-9 lg:px-12 lg:py-11"
            style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column" }}
          >
            <div className="railin" style={{ display: "flex", alignItems: "center" }}>
              {/* White horizontal lockup (wordmark baked in) — reads on navy. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-horizontal-white.svg" alt="Legal Marketing Intelligence" style={{ height: 30, width: "auto" }} />
            </div>

            <div className="railin" style={{ marginTop: 40, animationDelay: "90ms" }}>
              <div style={{ ...EYEBROW, letterSpacing: "0.2em", color: "var(--color-light-teal)", display: "flex", alignItems: "center", gap: 9, whiteSpace: "nowrap" }}>
                <span className="pulse-dot" style={{ width: 7, height: 7, borderRadius: 9999, background: "var(--color-light-teal)", display: "inline-block", flexShrink: 0 }} />
                Strategy Engine
              </div>
              <h1 style={{ color: "#fff", fontSize: "clamp(28px, 7vw, 36px)", lineHeight: 1.12, fontWeight: 700, marginTop: 16, letterSpacing: "-0.015em", textWrap: "balance" }}>
                A defensible, data-traced media strategy for {stateLabel}.
              </h1>
              <p className="hidden lg:block" style={{ color: "rgba(255,255,255,.72)", fontSize: 16, lineHeight: 1.62, marginTop: 18, maxWidth: 430 }}>
                Answer eight quick questions. We turn market-wide ad activity and risk signals into a plan you can defend in a partner meeting —{" "}
                <span style={{ color: "var(--color-light-teal)", fontWeight: 500 }}>every number carries its source.</span>
              </p>
            </div>

            {/* live brief — mirrors the user's picks */}
            <div className="railin" style={{ marginTop: 28, ...railCard, padding: "20px 22px", animationDelay: "180ms" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ ...EYEBROW, color: "rgba(255,255,255,.55)" }}>Your brief so far</span>
                <span className="lmi-mono" style={{ fontSize: 12, color: "var(--color-light-teal)" }}>{pct}%</span>
              </div>
              <p style={{ fontSize: 16, lineHeight: 1.55, marginTop: 12, color: "#fff", minHeight: 50 }}>
                <Brief segments={briefSegments} />
              </p>
              {briefChips.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 14 }}>
                  {briefChips.map((c) => (
                    <span key={c.v} className="chip-pop" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 11px", borderRadius: 9999, background: "rgba(79,184,196,.14)", border: "1px solid rgba(79,184,196,.3)", fontSize: 12.5, color: "#fff" }}>
                      <c.Icon size={13} style={{ color: "var(--color-light-teal)" }} />
                      {c.v}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* what you'll get — reorders to picks (desktop only; mobile leads with the form) */}
            <div className="railin hidden lg:block" style={{ marginTop: 30, paddingTop: 0 }}>
              <span style={{ ...EYEBROW, color: "rgba(255,255,255,.45)" }}>What you&apos;ll get back</span>
              <Deliverables items={dels} anyPicked={anyPicked} />
            </div>
          </div>
        </aside>

        {/* ───────────── RIGHT — the form ───────────── */}
        <section className="rounded-b-[20px] lg:rounded-b-none lg:rounded-r-[20px]" style={{ flex: 1, minWidth: 0, position: "relative", display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1, padding: "48px 44px 40px" }} className="lg:px-14">

            <div className="rise" style={{ ...riseStyle(1) }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
                <span style={{ width: 26, height: 26, borderRadius: 9999, background: "#fff", border: "1px solid var(--color-slate-200)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                  <ArrowLeft size={14} style={{ color: "var(--color-intelligence-teal)" }} />
                </span>
                <span style={{ fontSize: 13.5, color: "var(--color-slate-gray)" }}>
                  From your <b style={{ color: "var(--color-midnight-navy)", fontWeight: 600 }}>{stateLabel}</b> state report
                </span>
              </div>
              <h2 style={{ fontSize: 27, fontWeight: 700, color: "var(--color-midnight-navy)", letterSpacing: "-0.015em", fontFamily: "var(--font-heading)" }}>Build your market strategy</h2>
              <p style={{ fontSize: 15, color: "var(--color-slate-gray)", marginTop: 8, marginBottom: 40 }}>Takes about a minute. The more you tell us, the sharper the plan.</p>
            </div>

            <div style={{ display: "grid", gap: 36 }}>
              <div className="rise" style={{ ...riseStyle(2) }}>
                <FieldBlock label="Audience" required helper="Who is this strategy for?">
                  <Row>{AUDIENCES.map((a) => <Pill key={a.key} active={audience === a.key} onClick={() => setAudience(a.key)}>{a.label}</Pill>)}</Row>
                </FieldBlock>
              </div>

              <div className="rise" style={{ ...riseStyle(3) }}>
                <FieldBlock label="Case types" required helper="Select all that apply">
                  <Row>{CASE_TYPES.map((c) => <Pill key={c} Icon={CASE_META[c].Icon} active={caseTypes.includes(c)} onClick={() => toggle(caseTypes, c, setCaseTypes)}>{CASE_META[c].label}</Pill>)}</Row>
                </FieldBlock>
              </div>

              <div className="rise" style={{ display: "flex", gap: 32, flexWrap: "wrap", ...riseStyle(4) }}>
                <FieldBlock label="State" required>
                  <SelectField value={stateCode} onChange={onStateChange} options={US_STATES.map((s) => ({ value: s, label: s }))} render={(s) => `${s} — ${STATE_NAMES[s] ?? s}`} />
                </FieldBlock>
                <FieldBlock label="Market (DMA)">
                  <SelectField
                    value={dmaCode}
                    onChange={setDmaCode}
                    options={[{ value: "", label: "All markets (statewide)" }, ...dmaOptions.map((d) => ({ value: d.dma_code, label: d.display_name }))]}
                  />
                </FieldBlock>
              </div>

              <div className="rise" style={{ ...riseStyle(5) }}>
                <FieldBlock label="Budget tier" required helper="Monthly media budget">
                  <Row>
                    {BUDGET_TIERS.map((b) => {
                      const on = budgetTier === b.key;
                      return (
                        <button
                          key={b.key}
                          type="button"
                          onClick={() => setBudgetTier(b.key)}
                          className="lmi-focus"
                          style={{
                            flex: "1 1 140px",
                            textAlign: "left",
                            padding: "14px 16px",
                            borderRadius: 12,
                            cursor: "pointer",
                            border: "1px solid",
                            transition: "all 160ms var(--ease-standard)",
                            background: on ? "var(--color-midnight-navy)" : "#fff",
                            borderColor: on ? "var(--color-midnight-navy)" : "var(--color-slate-200)",
                            boxShadow: on ? "0 6px 16px -8px rgba(11,29,58,.5)" : "none",
                          }}
                        >
                          <div className="lmi-mono" style={{ fontSize: 17, fontWeight: 500, color: on ? "var(--color-light-teal)" : "var(--color-midnight-navy)" }}>{b.range}</div>
                          <div style={{ fontSize: 12.5, marginTop: 4, color: on ? "rgba(255,255,255,.7)" : "var(--color-slate-gray)" }}>per month</div>
                        </button>
                      );
                    })}
                  </Row>
                </FieldBlock>
              </div>

              <div className="rise" style={{ ...riseStyle(6) }}>
                <FieldBlock label="Primary goal" required helper="Pick the one that matters most">
                  <Row>{GOALS.map((g) => <Pill key={g} active={goal === g} onClick={() => setGoal(g)}>{g}</Pill>)}</Row>
                </FieldBlock>
              </div>

              <div className="rise" style={{ ...riseStyle(7) }}>
                <FieldBlock label="Existing channels" helper="What you run today">
                  <Row>{CHANNELS.map((c) => <Pill key={c.key} active={existingChannels.includes(c.key)} onClick={() => toggle(existingChannels, c.key, setExistingChannels)}>{c.label}</Pill>)}</Row>
                </FieldBlock>
              </div>

              <div className="rise" style={{ ...riseStyle(8) }}>
                <FieldBlock label="Intake capacity" required>
                  <Row>{INTAKE_OPTIONS.map((o) => <Pill key={o.key} active={intakeCapacity === o.key} onClick={() => setIntakeCapacity(o.key)}>{o.label}</Pill>)}</Row>
                </FieldBlock>
              </div>

              <div className="rise" style={{ ...riseStyle(9) }}>
                <FieldBlock label="What does winning look like in 90 days? Anything off-limits?" required>
                  <TextArea value={goalContext} onChange={setGoalContext} placeholder="e.g. 25 signed truck cases a quarter; we don't do billboards or daytime TV." />
                </FieldBlock>
              </div>

              <div className="rise" style={{ ...riseStyle(10) }}>
                <FieldBlock label="What are you running now, and what's working?">
                  <TextArea value={currentAdNotes} onChange={setCurrentAdNotes} placeholder="e.g. Search converts well, TV didn't pay back." />
                </FieldBlock>
              </div>

              <div className="rise" style={{ background: "#fff", border: "1px solid var(--color-slate-200)", borderRadius: 16, padding: "8px 24px 16px", boxShadow: "var(--shadow-card)", ...riseStyle(11) }}>
                <div style={{ paddingTop: 18, paddingBottom: 4 }}>
                  <FieldBlock label="Foundation check" required helper="So we don't recommend spend you can't convert" />
                </div>
                {READINESS.map((f) => <FoundationRow key={f.key} q={f.label} value={readiness[f.key]} onSet={(v) => setReadiness({ ...readiness, [f.key]: v })} />)}
              </div>

              {error ? (
                <div
                  role="alert"
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    padding: "16px 18px",
                    borderRadius: 12,
                    background: "rgba(239,68,68,.06)",
                    border: "1px solid rgba(239,68,68,.28)",
                  }}
                >
                  <TriangleAlert size={18} style={{ color: "var(--color-alert)", flexShrink: 0, marginTop: 1 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14.5, color: "var(--color-midnight-navy)" }}>We couldn&apos;t build that strategy.</div>
                    <div style={{ fontSize: 13.5, color: "var(--color-slate-gray)", marginTop: 3, lineHeight: 1.5 }}>{error}</div>
                  </div>
                  <button
                    type="button"
                    className="lmi-focus"
                    onClick={generate}
                    disabled={loading}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 7,
                      padding: "8px 14px",
                      borderRadius: 9999,
                      background: "#fff",
                      color: "var(--color-intelligence-teal)",
                      border: "1px solid var(--color-intelligence-teal)",
                      cursor: loading ? "not-allowed" : "pointer",
                      fontFamily: "var(--font-heading)",
                      fontSize: 13.5,
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    <RefreshCw size={14} />
                    Try again
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          {/* sticky generate bar */}
          <div
            className="rounded-b-[20px] lg:rounded-b-none lg:rounded-br-[20px]"
            style={{
              position: "sticky",
              bottom: 0,
              background: "rgba(255,255,255,.85)",
              backdropFilter: "blur(10px)",
              borderTop: "1px solid var(--color-slate-200)",
              padding: "16px 44px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
              {loading ? (
                <>
                  <div style={{ width: 130, height: 6, borderRadius: 9999, background: "var(--color-slate-200)", overflow: "hidden", position: "relative", flexShrink: 0 }}>
                    <div
                      className="lmi-indeterminate-bar"
                      style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: "33%", borderRadius: 9999, background: "var(--color-intelligence-teal)" }}
                    />
                  </div>
                  <span aria-live="polite" style={{ fontSize: 13, color: "var(--color-slate-gray)" }}>{loadingStages[loadingStage]}</span>
                </>
              ) : (
                <>
                  <div style={{ width: 130, height: 6, borderRadius: 9999, background: "var(--color-slate-200)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: "100%", background: "var(--color-intelligence-teal)", transformOrigin: "left", transform: `scaleX(${pct / 100})`, transition: "transform 360ms var(--ease-standard)" }} />
                  </div>
                  <span style={{ fontSize: 13, color: "var(--color-slate-gray)" }}>
                    <b className="lmi-mono" style={{ color: "var(--color-midnight-navy)" }}>{done}</b> of {total} ready
                  </span>
                </>
              )}
            </div>
            <button
              type="button"
              className="cta lmi-focus"
              onClick={generate}
              disabled={loading || !canSubmit}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 9,
                padding: "13px 26px",
                borderRadius: 9999,
                background: "var(--color-intelligence-teal)",
                color: "#fff",
                border: "none",
                cursor: loading || !canSubmit ? "not-allowed" : "pointer",
                fontFamily: "var(--font-heading)",
                fontSize: 15,
                fontWeight: 600,
                boxShadow: "0 6px 16px -4px rgba(26,140,150,.5)",
                opacity: loading || !canSubmit ? 0.55 : 1,
              }}
            >
              {loading ? "Building strategy…" : "Generate strategy"}
              {loading ? <Loader2 size={17} className="animate-spin" /> : <ArrowRight size={17} />}
            </button>
          </div>
        </section>
      </div>

      <div ref={deckRef}>{result ? <StrategyDeck data={result} /> : null}</div>
    </div>
  );
}
