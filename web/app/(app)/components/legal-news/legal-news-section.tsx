"use client";

/* ------------------------------------------------------------------ */
/*  Recent Legal Activity — shared, state-parameterized.              */
/*                                                                    */
/*  A calm auto-advancing carousel of recent SINGLE-INCIDENT PI news  */
/*  (verdicts, settlements, crashes, OSHA fatalities, filings) for a  */
/*  state. Outcome cards lead with a big dollar figure; incident      */
/*  cards lead with the headline. Newest first, both streams mixed.   */
/*                                                                    */
/*  Three presentations, all sharing one fetch/carousel/filter core:  */
/*   - numbered  → bespoke Alabama page, numbered SectionHeading.      */
/*   - embedded  → v2 [slug] client + legacy states (host renders its */
/*                 own group header), mirroring components/competitive.*/
/*   - hero      → Alabama Design D: a dark midnight-navy "live feed"  */
/*                 block at the top of the page (LIVE eyebrow, cards   */
/*                 sit directly on navy, money lands first). Opt-in;   */
/*                 leaves numbered/embedded untouched.                 */
/*                                                                    */
/*  Motion is the one place on the state page auto-motion is allowed: */
/*  slow 6s dwell, pause on hover/focus, and a full reduced-motion    */
/*  fallback (no auto-advance; the track is a scroll-snap row the      */
/*  user drives with arrows/dots/keyboard/swipe).                     */
/* ------------------------------------------------------------------ */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  MapPin,
  Newspaper,
  Database,
} from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { SectionHeading } from "@/components/state-intelligence/SectionHeading";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Stream = "outcome" | "incident";

export interface LegalNewsItem {
  id: string;
  title: string;
  summary: string | null;
  source_name: string | null;
  source_url: string;
  published_at: string | null;
  category: string | null;
  stream: Stream;
  amount_usd: number | null;
  location: string | null;
  practice_area: string | null;
}

type FilterKey = "all" | "outcome" | "incident";

interface NewsQueryClient {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (
        col: string,
        val: string,
      ) => {
        order: (
          col: string,
          opts: { ascending: boolean; nullsFirst?: boolean },
        ) => {
          limit: (
            n: number,
          ) => Promise<{ data: LegalNewsItem[] | null; error: { message: string } | null }>;
        };
      };
    };
  };
}

/* ------------------------------------------------------------------ */
/*  Category styling — color + label (never color alone).             */
/* ------------------------------------------------------------------ */

interface CategoryStyle {
  accent: string; // hex for the 3px top rule
  badge: string; // tailwind badge classes
  label: string;
}

const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  verdict: { accent: "#16A34A", badge: "bg-emerald-50 text-emerald-700", label: "Verdict" },
  settlement: { accent: "#E0A030", badge: "bg-amber-50 text-amber-700", label: "Settlement" },
  osha: { accent: "#B45309", badge: "bg-orange-50 text-orange-700", label: "OSHA" },
  crash: { accent: "#2E5077", badge: "bg-blue-50 text-steel-blue", label: "Incident" },
  filing: { accent: "#6B7280", badge: "bg-slate-100 text-slate-600", label: "Filing" },
  regulatory: { accent: "#E11D48", badge: "bg-rose-50 text-rose-700", label: "Regulatory" },
  general: { accent: "#6B7280", badge: "bg-slate-100 text-slate-600", label: "News" },
};

function styleFor(category: string | null): CategoryStyle {
  return CATEGORY_STYLES[category ?? "general"] ?? CATEGORY_STYLES.general;
}

/* Neutral rule for non-money cards in hero mode, so verdicts & settlements
   (the "outcome" stream) carry the only saturated accents and the money
   lands first against the dark block. */
const HERO_NEUTRAL_ACCENT = "#CBD5E1";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fmtAmount(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n.toLocaleString()}`;
}

function relativeDate(iso: string | null): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const days = Math.floor((Date.now() - then) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

const AUTO_ADVANCE_MS = 6000;

/* ------------------------------------------------------------------ */
/*  News card                                                         */
/* ------------------------------------------------------------------ */

function NewsCard({ item, hero = false }: { item: LegalNewsItem; hero?: boolean }) {
  const s = styleFor(item.category);
  const hasAmount = item.amount_usd != null && item.amount_usd > 0;
  // In hero mode only the money (outcome stream: verdicts + settlements) keeps
  // its saturated top rule; incidents & filings drop to a neutral rule.
  const accent = hero && item.stream !== "outcome" ? HERO_NEUTRAL_ACCENT : s.accent;

  return (
    <a
      href={item.source_url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex w-[280px] flex-none snap-start flex-col rounded-xl border border-cloud bg-white p-4 shadow-sm transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-intelligence-teal sm:w-[320px]"
      style={{ borderTop: `3px solid ${accent}` }}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${s.badge}`}
        >
          {s.label}
        </span>
        {item.published_at && (
          <span className="text-[11px] font-medium text-slate-gray">
            {relativeDate(item.published_at)}
          </span>
        )}
      </div>

      {hasAmount && (
        <div className="mt-3 font-mono text-[28px] font-semibold leading-none text-midnight-navy">
          {fmtAmount(item.amount_usd as number)}
        </div>
      )}

      <h3
        className={`text-sm font-semibold leading-snug text-midnight-navy ${
          hasAmount ? "mt-2 line-clamp-2" : "mt-3 line-clamp-3"
        }`}
      >
        {item.title}
      </h3>

      {item.summary && (
        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-gray">
          {item.summary}
        </p>
      )}

      <div className="mt-auto flex items-center gap-1.5 pt-3 text-[11px] font-medium text-intelligence-teal">
        {item.location && (
          <>
            <MapPin className="h-3 w-3 flex-none" aria-hidden />
            <span className="truncate">{item.location}</span>
            <span className="text-slate-gray/50">·</span>
          </>
        )}
        <span className="truncate group-hover:underline">
          {item.source_name || "Source"}
        </span>
        <ArrowUpRight className="h-3 w-3 flex-none" aria-hidden />
      </div>
    </a>
  );
}

/* ------------------------------------------------------------------ */
/*  Carousel                                                          */
/* ------------------------------------------------------------------ */

function Carousel({
  items,
  stateName,
  hero = false,
}: {
  items: LegalNewsItem[];
  stateName: string;
  hero?: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef(0);
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [reduced, setReduced] = useState(false);

  /* prefers-reduced-motion (live) */
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const measureOverflow = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setHasOverflow(el.scrollWidth > el.clientWidth + 8);
  }, []);

  useEffect(() => {
    measureOverflow();
    window.addEventListener("resize", measureOverflow);
    return () => window.removeEventListener("resize", measureOverflow);
  }, [measureOverflow, items.length]);

  const goTo = useCallback(
    (index: number) => {
      const el = trackRef.current;
      if (!el) return;
      const cards = Array.from(el.children) as HTMLElement[];
      if (cards.length === 0) return;
      const clamped = ((index % cards.length) + cards.length) % cards.length;
      const left = cards[clamped].offsetLeft - cards[0].offsetLeft;
      el.scrollTo({ left, behavior: reduced ? "auto" : "smooth" });
      currentRef.current = clamped;
      setCurrent(clamped);
    },
    [reduced],
  );

  /* keep `current` in sync when the user scrolls / swipes manually */
  const onScroll = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const cards = Array.from(el.children) as HTMLElement[];
    if (cards.length === 0) return;
    const base = cards[0].offsetLeft;
    let idx = 0;
    let min = Infinity;
    cards.forEach((c, i) => {
      const d = Math.abs(c.offsetLeft - base - el.scrollLeft);
      if (d < min) {
        min = d;
        idx = i;
      }
    });
    currentRef.current = idx;
    setCurrent(idx);
  }, []);

  /* auto-advance — paused on hover/focus, off under reduced motion */
  useEffect(() => {
    if (reduced || paused || !hasOverflow || items.length <= 1) return;
    const id = window.setInterval(() => {
      goTo(currentRef.current + 1);
    }, AUTO_ADVANCE_MS);
    return () => window.clearInterval(id);
  }, [reduced, paused, hasOverflow, items.length, goTo]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goTo(currentRef.current + 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goTo(currentRef.current - 1);
      }
    },
    [goTo],
  );

  const showDots = items.length >= 2 && items.length <= 8;

  /* hero controls sit on the dark block, so they read light instead of
     the default white-card-on-white treatment. */
  const navBtn = hero
    ? "rounded-lg border border-white/15 bg-white/5 p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-intelligence-teal"
    : "rounded-lg border border-cloud bg-white p-1.5 text-slate-gray transition-colors hover:bg-intelligence-teal/5 hover:text-midnight-navy focus:outline-none focus-visible:ring-2 focus-visible:ring-intelligence-teal";

  return (
    <div>
      {/* control row */}
      {hasOverflow && (
        <div className="mb-3 flex items-center justify-end gap-2">
          {!showDots && (
            <span
              className={`mr-1 font-mono text-[11px] tabular-nums ${
                hero ? "text-white/60" : "text-slate-gray"
              }`}
            >
              {current + 1} / {items.length}
            </span>
          )}
          <button
            type="button"
            onClick={() => goTo(current - 1)}
            aria-label="Previous"
            className={navBtn}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => goTo(current + 1)}
            aria-label="Next"
            className={navBtn}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* track */}
      <div
        ref={trackRef}
        onScroll={onScroll}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
        onKeyDown={onKeyDown}
        role="region"
        aria-roledescription="carousel"
        aria-label={`Recent legal activity in ${stateName}`}
        tabIndex={0}
        className={`flex snap-x snap-mandatory gap-4 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] focus:outline-none focus-visible:ring-2 focus-visible:ring-intelligence-teal/40 [&::-webkit-scrollbar]:hidden ${
          reduced ? "" : "scroll-smooth"
        }`}
      >
        {items.map((item) => (
          <NewsCard key={item.id} item={item} hero={hero} />
        ))}
      </div>

      {/* dots */}
      {hasOverflow && showDots && (
        <div className="mt-3 flex items-center justify-center gap-1.5">
          {items.map((item, i) => (
            <button
              key={item.id}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Go to item ${i + 1}`}
              aria-current={i === current}
              className={`h-1.5 rounded-full transition-all ${
                i === current
                  ? "w-5 bg-intelligence-teal"
                  : hero
                    ? "w-1.5 bg-white/30 hover:bg-white/50"
                    : "w-1.5 bg-cloud hover:bg-slate-gray/40"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section wrapper (data fetch + states + filter)                    */
/* ------------------------------------------------------------------ */

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "outcome", label: "Verdicts" },
  { key: "incident", label: "Incidents" },
];

export function LegalNewsSection({
  stateName,
  stateCode,
  embedded = false,
  numbered = true,
  sectionNumber = 2,
  hero = false,
}: {
  stateName: string;
  stateCode: string;
  /** When true (v2 / legacy hosts), skip the heading — the host renders one. */
  embedded?: boolean;
  /** Show the numbered SectionHeading (bespoke Alabama page). */
  numbered?: boolean;
  /** Section number for the numbered heading. */
  sectionNumber?: number;
  /** Dark "live feed" hero block (Alabama Design D). Overrides numbered/embedded. */
  hero?: boolean;
}) {
  const [items, setItems] = useState<LegalNewsItem[] | null>(null);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    // Reset to the loading state when the query key (state / retry) changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(null);
    setError(false);
    const client = getSupabase() as unknown as NewsQueryClient;
    client
      .from("state_legal_news")
      .select(
        "id,title,summary,source_name,source_url,published_at,category,stream,amount_usd,location,practice_area",
      )
      .eq("state_abbr", stateCode)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(15)
      .then(({ data, error: err }) => {
        if (!active) return;
        if (err) {
          setError(true);
          setItems([]);
          return;
        }
        setItems(data ?? []);
      });
    return () => {
      active = false;
    };
  }, [stateCode, reloadKey]);

  const filtered = useMemo(() => {
    if (!items) return [];
    if (filter === "all") return items;
    return items.filter((i) => i.stream === filter);
  }, [items, filter]);

  const hasOutcomes = useMemo(
    () => (items ?? []).some((i) => i.stream === "outcome"),
    [items],
  );
  const hasIncidents = useMemo(
    () => (items ?? []).some((i) => i.stream === "incident"),
    [items],
  );

  /* -- shared body: loading / error / empty / carousel -- */
  const body =
    items === null ? (
      <LoadingSkeleton />
    ) : error ? (
      <div
        className={`rounded-lg p-8 text-center ${
          hero ? "border border-white/10 bg-white/[0.04]" : "border border-cloud bg-cloud/40"
        }`}
      >
        <Database
          className={`mx-auto mb-3 h-8 w-8 ${hero ? "text-white/30" : "text-slate-gray/40"}`}
        />
        <p className={`text-sm font-medium ${hero ? "text-white/80" : "text-slate-gray"}`}>
          Recent legal activity couldn&apos;t be loaded right now.
        </p>
        <div className="mt-3 flex justify-center">
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className={
              hero
                ? "rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10"
                : "rounded-lg border border-cloud bg-white px-3 py-1.5 text-xs font-semibold text-intelligence-teal hover:bg-intelligence-teal/5"
            }
          >
            Retry
          </button>
        </div>
      </div>
    ) : filtered.length === 0 ? (
      <EmptyState stateName={stateName} filtered={items.length > 0} hero={hero} />
    ) : (
      <Carousel items={filtered} stateName={stateName} hero={hero} />
    );

  /* -- All / Verdicts / Incidents filter -- */
  const filterGroup = items && items.length > 0 && (
    <div
      className={`flex flex-none items-center gap-0.5 rounded-lg p-0.5 ${
        hero ? "border border-white/10 bg-white/[0.06]" : "border border-cloud bg-cloud/40"
      }`}
      role="group"
      aria-label="Filter legal activity"
    >
      {FILTERS.map((f) => {
        const disabled =
          (f.key === "outcome" && !hasOutcomes) ||
          (f.key === "incident" && !hasIncidents);
        const isActive = filter === f.key;
        return (
          <button
            key={f.key}
            type="button"
            disabled={disabled}
            onClick={() => setFilter(f.key)}
            aria-pressed={isActive}
            className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              hero
                ? isActive
                  ? "bg-white text-midnight-navy shadow-sm"
                  : "text-white/70 hover:text-white"
                : isActive
                  ? "bg-white text-midnight-navy shadow-sm"
                  : "text-slate-gray hover:text-midnight-navy"
            }`}
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );

  /* Only claim "Live" when there's actually live data on the block. Across the
     ~40 states this template serves, many start with an empty or still-filling
     feed; a pulsing green LIVE dot over an empty box would be dishonest. */
  const live = !!(items && items.length > 0);

  /* ---- Hero presentation (Alabama Design D) ---- */
  if (hero) {
    return (
      <section id="activity" className="scroll-mt-20">
        <div className="rounded-2xl bg-midnight-navy p-6 text-white shadow-sm sm:p-7">
          {/* eyebrow */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2" aria-hidden>
                  {live && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75 motion-reduce:animate-none" />
                  )}
                  <span
                    className={`relative inline-flex h-2 w-2 rounded-full ${
                      live ? "bg-emerald-400" : "bg-white/40"
                    }`}
                  />
                </span>
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/90">
                  {live ? "Live · The signal behind your ad spend" : "Recent legal activity"}
                </span>
              </div>
              <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-white/65">
                Verdicts, settlements &amp; incidents moving the {stateName} market — the
                live case-acquisition and timing signal behind your campaigns.
              </p>
              {items && items.length > 0 && (
                <p className="mt-2 text-[11px] font-medium text-white/65">
                  Last 30 days · {items.length} {items.length === 1 ? "item" : "items"}
                </p>
              )}
            </div>
            {filterGroup}
          </div>

          <div className="mt-5">{body}</div>

          {items && items.length > 0 && (
            <p className="mt-4 text-[11px] leading-relaxed text-white/60">
              Single-incident PI only (no mass torts). Headlines aggregated from public
              news and government sources; click any card to read the original. Not legal
              advice.
            </p>
          )}
        </div>
      </section>
    );
  }

  /* ---- Default presentation (numbered / embedded) ---- */
  const heading = !embedded && (
    <div className="flex flex-wrap items-center gap-3">
      {numbered ? (
        <SectionHeading n={sectionNumber} title="Recent Legal Activity" />
      ) : (
        <h2 className="font-heading text-2xl font-bold text-midnight-navy">
          Recent Legal Activity
        </h2>
      )}
      <span className="rounded-full bg-intelligence-teal/10 px-2.5 py-1 text-xs font-semibold text-intelligence-teal">
        Single-incident PI
      </span>
    </div>
  );

  return (
    <section id="activity" className="scroll-mt-20 space-y-4">
      {heading}

      <div className="rounded-xl border border-cloud bg-white p-6 shadow-sm">
        {/* header: so-what + filter */}
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            <h3 className="font-heading text-lg font-bold text-midnight-navy">
              What&apos;s moving in the {stateName} market
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-gray">
              Recent verdicts, settlements, and injury reports — the live
              case-acquisition and timing signal behind your ad spend.
            </p>
            {items && items.length > 0 && (
              <p className="mt-2 text-[11px] font-medium text-slate-gray">
                Last 30 days · {items.length} {items.length === 1 ? "item" : "items"}
              </p>
            )}
          </div>

          {/* All / Verdicts / Incidents */}
          {filterGroup}
        </div>

        {/* body */}
        {body}

        {/* footnote */}
        {items && items.length > 0 && (
          <p className="mt-4 text-[11px] leading-relaxed text-slate-gray">
            Single-incident PI only (no mass torts). Headlines aggregated from
            public news and government sources; click any card to read the
            original. Not legal advice.
          </p>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Loading + empty                                                   */
/* ------------------------------------------------------------------ */

function LoadingSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-[280px] flex-none rounded-xl border border-cloud border-t-[3px] border-t-cloud bg-white p-4 sm:w-[320px]"
        >
          <div className="flex items-center justify-between">
            <div className="h-4 w-16 animate-pulse rounded-full bg-cloud" />
            <div className="h-3 w-10 animate-pulse rounded bg-cloud" />
          </div>
          <div className="mt-4 h-7 w-24 animate-pulse rounded bg-cloud" />
          <div className="mt-3 h-3.5 w-full animate-pulse rounded bg-cloud" />
          <div className="mt-2 h-3.5 w-4/5 animate-pulse rounded bg-cloud" />
          <div className="mt-4 h-3 w-28 animate-pulse rounded bg-cloud" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  stateName,
  filtered,
  hero = false,
}: {
  stateName: string;
  filtered: boolean;
  hero?: boolean;
}) {
  return (
    <div
      className={`rounded-lg p-8 text-center ${
        hero ? "border border-white/10 bg-white/[0.04]" : "border border-cloud bg-cloud/40"
      }`}
    >
      <Newspaper
        className={`mx-auto mb-3 h-8 w-8 ${hero ? "text-white/30" : "text-slate-gray/40"}`}
      />
      <p className={`text-sm font-medium ${hero ? "text-white" : "text-midnight-navy"}`}>
        {filtered
          ? "No items match this filter right now."
          : `No recent single-incident PI activity tracked for ${stateName}.`}
      </p>
      <p
        className={`mx-auto mt-1.5 max-w-sm text-xs leading-relaxed ${
          hero ? "text-white/55" : "text-slate-gray"
        }`}
      >
        {filtered
          ? "Switch back to All to see the full feed."
          : "We surface verdicts, settlements, crashes, and OSHA reports as they appear in public news. Check back soon."}
      </p>
    </div>
  );
}
