"use client";

/**
 * Strategy Engine — on-screen deck (PR 3b).
 *
 * Faithful port of the locked Claude Design template ("LMI Strategy Deck") into
 * responsive React sections, data-bound to the Strategy object. White-label: the
 * accent + brand come from `data.brand` (tenant_branding), applied via the
 * --lmi-accent / --lmi-accent-2 CSS vars the template keys on. Source-tag chips,
 * the 3-dot data-depth badge, and the modeled/"est." caveats are preserved.
 */

import { useState, type CSSProperties } from "react";
import { Download, Loader2 } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

const NAVY = "#0B1D3A";
const LIGHT = "#F4F7FA";
const BORDER = "#DCE4ED";
const MUTED = "#5C6E86";
const LABEL = "#8696AC";
const CHIP = "#E9EFF5";

const mono = "ui-monospace, SFMono-Regular, Menlo, monospace";

function pretty(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Strategy tort slug → Campaign Builder pi_category enum (different vocab).
 *  Unmapped slugs (nursing_home, workers_comp) have no builder category. */
const TORT_TO_PI_CATEGORY: Record<string, string> = {
  truck_accident: "truck_accident",
  motor_vehicle: "car_accident",
  motorcycle: "motorcycle_accident",
  boating: "boating_accident",
};

function SourceChip({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{ fontFamily: mono, background: CHIP, border: `1px solid ${BORDER}`, color: "#4A5E78" }}
      className="rounded px-2 py-0.5 text-[10px] uppercase tracking-wide"
    >
      {children}
    </span>
  );
}

function DepthBadge({ depth }: { depth: string }) {
  const filled = depth === "strong" ? 3 : depth === "moderate" ? 2 : 1;
  return (
    <span className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1" style={{ borderColor: BORDER }}>
      <span className="text-[11px]" style={{ color: MUTED }}>Data depth</span>
      <span className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-2 w-2 rounded-full" style={{ background: i < filled ? "var(--lmi-accent)" : "#CDD8E4" }} />
        ))}
      </span>
      <span className="text-[11px] font-bold capitalize" style={{ color: NAVY }}>{depth}</span>
    </span>
  );
}

function statusPill(status: string) {
  if (status === "open") {
    return <span className="rounded px-3 py-1 text-xs font-bold uppercase tracking-wide text-white" style={{ background: "var(--lmi-accent)" }}>Open</span>;
  }
  const cls = status === "defended" ? "bg-[#E7EDF3] text-[#44566E]" : "border border-[#C9D4E0] text-[#6B7C92]";
  return <span className={`rounded px-3 py-1 text-xs font-semibold capitalize ${cls}`}>{status}</span>;
}

export default function StrategyDeck({ data }: { data: any }) {
  const brand = data.brand ?? {};
  const accent = brand.primary_color || "#1A8C96";
  const accent2 = brand.accent_color || "#3FBEC8";
  const rootStyle = { ["--lmi-accent" as any]: accent, ["--lmi-accent-2" as any]: accent2 } as CSSProperties;

  const counties = data.opportunity?.counties ?? [];
  const maxTruck = Math.max(1, ...counties.map((c: any) => c.truck_fatalities || 0));
  const recs = data.recommendations ?? [];
  const piCategory = TORT_TO_PI_CATEGORY[data.handoff?.case_type ?? ""];
  const buildUrl = `/campaigns/builder?practice_area=personal_injury&state=${data.market.state}${piCategory ? `&pi_category=${piCategory}` : ""}${data.market?.dma_code ? `&market_dma_code=${data.market.dma_code}` : ""}`;

  return (
    <div style={rootStyle} className="mt-8 space-y-5">
      <div className="flex justify-end">
        <DownloadDeckButton data={data} />
      </div>

      {/* 1. COVER */}
      <section className="rounded-2xl p-10 text-white" style={{ background: NAVY }}>
        <div className="flex items-center justify-between">
          {brand.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brand.logo_url} alt={brand.company_name} className="h-10" />
          ) : (
            <div className="rounded border border-white/30 px-4 py-2 text-xs font-semibold tracking-widest text-white/60">{brand.company_name ?? "Legal Marketing Intelligence"}</div>
          )}
          <span style={{ fontFamily: mono, color: "#5E7090" }} className="text-xs tracking-widest">white-label</span>
        </div>
        <div className="mt-10">
          <div className="text-sm font-bold tracking-[0.22em]" style={{ color: "var(--lmi-accent-2)" }}>MARKETING INTELLIGENCE STRATEGY</div>
          <h2 className="mt-3 text-4xl font-bold leading-tight md:text-5xl">{data.market.label} Marketing Strategy</h2>
          <div className="mt-2 text-2xl font-medium" style={{ color: "var(--lmi-accent-2)" }}>{pretty((data.case_types ?? []).join(", "))}</div>
          <div className="mt-6 flex flex-wrap gap-10 text-sm">
            <div><div style={{ fontFamily: mono, color: "#6E809A" }} className="text-[11px] uppercase tracking-wider">Prepared by</div><div className="mt-1 font-semibold">{brand.company_name ?? "Legal Marketing Intelligence"}</div></div>
            <div><div style={{ fontFamily: mono, color: "#6E809A" }} className="text-[11px] uppercase tracking-wider">Audience</div><div className="mt-1 font-semibold capitalize">{data.audience}</div></div>
            <div><div style={{ fontFamily: mono, color: "#6E809A" }} className="text-[11px] uppercase tracking-wider">Confidence</div><div className="mt-1 font-semibold capitalize">{data.confidence}</div></div>
          </div>
        </div>
        <div className="mt-8 flex items-center gap-3 border-t border-white/10 pt-5 text-sm" style={{ color: "#AEBDD0" }}>
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--lmi-accent)" }} />
          Built on <b className="text-white">FARS</b> crash data, competitive ad intelligence, <b className="text-white">Census</b> demographics, and market media data.
        </div>
      </section>

      {/* 2. THE BRIEF */}
      <Slide eyebrow="Inputs" title="The brief, restated">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            ["Audience", pretty(data.audience)],
            ["Case types", pretty((data.case_types ?? []).join(", "))],
            ["Market", data.market.label],
            ["Budget tier", pretty(data.budget_tier ?? "—")],
            ["Goal", data.goal ?? "—"],
            ["Confidence", pretty(data.confidence)],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl border bg-white p-5" style={{ borderColor: BORDER }}>
              <div style={{ fontFamily: mono, color: "var(--lmi-accent)" }} className="text-[11px] uppercase tracking-wider">{k}</div>
              <div className="mt-2 text-lg font-semibold" style={{ color: NAVY }}>{v}</div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm" style={{ color: MUTED }}>{data.prose?.market_read}</p>
      </Slide>

      {/* 3. WHERE TO PLAY */}
      <Slide eyebrow="Opportunity" title="Where to play" sub={`${leadLabel(data.opportunity?.lead_metric)} vs reachable demand, by county`} tags={["FARS " + yr(data.opportunity), "Census"]}>
        <div className="space-y-3">
          {counties.slice(0, 8).map((c: any) => (
            <div key={c.county_name} className="flex items-center gap-4">
              <div className="w-32 text-sm font-semibold" style={{ color: NAVY }}>{c.county_name}</div>
              <div className="h-7 flex-1 rounded" style={{ background: "#E4EBF2" }}>
                <div className="h-full rounded" style={{ width: `${Math.round(((c.truck_fatalities || 0) / maxTruck) * 100)}%`, background: "var(--lmi-accent)" }} />
              </div>
              <div className="w-10 text-right text-lg font-bold" style={{ color: NAVY }}>{c.truck_fatalities}</div>
              <div className="w-44 text-right text-xs" style={{ fontFamily: mono, color: MUTED }}>{c.pct_with_internet ?? "—"}% reach · {c.total_population ? (c.total_population / 1000).toFixed(0) + "K" : "—"}</div>
            </div>
          ))}
        </div>
        <Callout>Cases concentrate where the bars run longest — that is where the demand is, and where to weight the buy.</Callout>
      </Slide>

      {/* 4. COMPETITIVE FIELD */}
      <Slide eyebrow="Competitive landscape" title="The competitive field" sub="Who's advertising in the market, ranked by observed presence share" tags={["pi_search", "ad library"]}>
        <table className="w-full text-left text-sm">
          <thead><tr className="border-b-2 text-xs uppercase" style={{ borderColor: "#C9D4E0", color: LABEL, fontFamily: mono }}>
            <th className="py-2">Firm</th><th className="text-right">Presence share</th>
          </tr></thead>
          <tbody>
            {(data.competitive?.advertisers ?? []).slice(0, 6).map((a: any) => (
              <tr key={a.name} className="border-b" style={{ borderColor: "#E0E7EF" }}>
                <td className="py-3 text-base font-semibold" style={{ color: NAVY }}>{a.rank}. {a.name}</td>
                <td className="py-3"><div className="ml-auto flex w-48 items-center gap-3">
                  <div className="h-3.5 flex-1 rounded-full" style={{ background: "#E4EBF2" }}><div className="h-full rounded-full" style={{ width: `${Math.round(a.share * 100)}%`, background: "var(--lmi-accent)" }} /></div>
                  <span className="w-10 text-right font-bold" style={{ color: NAVY }}>{Math.round(a.share * 100)}%</span>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-[11px]" style={{ color: MUTED }}>Presence share = share of observed ad activity. No estimated dollar spend is shown — per-firm spend isn&rsquo;t reliably sourceable for local PI, so the field is ranked by observed presence rather than modeled cost.</p>
      </Slide>

      {/* 6. WHITE SPACE */}
      <Slide eyebrow="Competitive landscape" title="Where the white space is" tags={["ad library"]}>
        <div className="space-y-2">
          {(data.competitive?.channels ?? []).map((c: any) => (
            <div key={c.channel} className="flex items-center gap-4 rounded-lg border-b px-3 py-3" style={{ borderColor: "#E0E7EF", background: c.status === "open" ? "#EAF6F6" : undefined }}>
              <div className="w-56 text-base font-semibold" style={{ color: NAVY }}>{c.label}{!c.measured ? " (modeled)" : ""}</div>
              <div className="w-28">{statusPill(c.status)}</div>
              <div className="flex-1 text-sm" style={{ color: c.status === "open" ? "#14707A" : MUTED }}>
                {c.status === "open" ? "No PI firm present" : `${c.active_firms} firm${c.active_firms === 1 ? "" : "s"} active`}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span style={{ fontFamily: mono, color: LABEL }} className="text-[11px]">Untracked channels: presence modeled from ad-library coverage.</span>
        </div>
      </Slide>

      {/* 7. DIVIDER */}
      <section className="rounded-2xl p-10 text-white" style={{ background: NAVY }}>
        <div className="flex items-center justify-between">
          <div className="text-sm font-bold tracking-[0.22em]" style={{ color: "var(--lmi-accent-2)" }}>THE PRODUCT</div>
          <span style={{ fontFamily: mono, color: "#5E7090" }} className="text-sm">01 — {String(recs.length).padStart(2, "0")}</span>
        </div>
        <h2 className="mt-5 text-4xl font-bold md:text-5xl">The recommendations</h2>
        <div className="mt-3 text-xl" style={{ color: "#9FB1C7" }}>Each defensible to the number — opportunity, white space, fit.</div>
      </section>

      {/* 8-10. RECOMMENDATIONS */}
      {recs.map((r: any, i: number) => (
        <Slide key={i} eyebrow={`Recommendation ${String(i + 1).padStart(2, "0")}`} title={r.headline} right={<DepthBadge depth={r.data_depth} />}>
          <div className="grid gap-4 md:grid-cols-3">
            {(["opportunity", "white_space", "fit"] as const).map((k, idx) => (
              <div key={k} className="relative rounded-xl border bg-white p-6" style={{ borderColor: BORDER }}>
                <div className="absolute -top-3 left-6 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: "var(--lmi-accent)" }}>{idx + 1}</div>
                <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--lmi-accent)" }}>{k.replace("_", " ")}</div>
                <div className="mt-2 text-3xl font-bold leading-none" style={{ color: NAVY }}>{r[k].value}</div>
                <div className="mt-2 text-sm" style={{ color: "#3A4D67" }}>{r[k].text}</div>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-3 border-t pt-4" style={{ borderColor: BORDER }}>
            {(r.proof ?? []).map((p: any, j: number) => (
              <div key={j} className="flex flex-col gap-1">
                <div className="text-sm" style={{ color: "#3A4D67" }}><b style={{ color: NAVY }}>{p.value}</b></div>
                <SourceChip>{p.source}</SourceChip>
              </div>
            ))}
            <div className="ml-auto text-sm" style={{ color: MUTED }}>
              <span className="font-semibold" style={{ color: NAVY }}>The buy:</span> {r.buy?.kind === "outlets" ? (r.buy.outlets ?? []).map((o: any) => o.name).join(", ") : r.buy?.target}
            </div>
          </div>
        </Slide>
      ))}

      {(data.watch_list ?? []).length > 0 ? (
        <Slide eyebrow="Watch list" title="Emerging signals (not yet a full recommendation)">
          <ul className="space-y-1 text-sm" style={{ color: MUTED }}>
            {data.watch_list.map((w: any, i: number) => <li key={i}><b style={{ color: NAVY }}>{pretty(w.channel)}</b> — {w.reason}</li>)}
          </ul>
        </Slide>
      ) : null}

      {/* 11. INTEGRATED PLAN */}
      <Slide eyebrow="Integrated plan" title="The budget, by channel and funnel stage" tags={[pretty(data.integrated_plan?.cadence ?? ""), pretty(data.integrated_plan?.funnel_emphasis ?? "")]}>
        <div className="space-y-3">
          {(data.integrated_plan?.allocation ?? []).map((a: any) => (
            <div key={a.channel} className="flex items-center gap-4">
              <div className="w-52 text-sm font-semibold" style={{ color: NAVY }}>{a.label} <span style={{ color: MUTED }} className="font-normal">({a.stage})</span></div>
              <div className="h-6 flex-1 rounded" style={{ background: "#E4EBF2" }}><div className="h-full rounded" style={{ width: `${a.pct}%`, background: "var(--lmi-accent)" }} /></div>
              <div className="w-12 text-right font-bold" style={{ color: NAVY }}>{a.pct}%</div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm" style={{ color: MUTED }}>{data.prose?.channel_narrative}</p>
      </Slide>

      {/* 12. HANDOFF */}
      <section className="rounded-2xl p-10 text-white" style={{ background: NAVY }}>
        <div className="text-sm font-bold tracking-[0.22em]" style={{ color: "var(--lmi-accent-2)" }}>HANDOFF</div>
        <h2 className="mt-4 text-3xl font-bold md:text-4xl">Turn this strategy into a campaign</h2>
        <p className="mt-3 max-w-2xl text-lg" style={{ color: "#9FB1C7" }}>{data.prose?.approach_rationale}</p>
        <a href={buildUrl} className="mt-6 inline-block rounded-lg px-6 py-3 text-sm font-bold text-white" style={{ background: "var(--lmi-accent)" }}>
          Continue in Campaign Builder →
        </a>
      </section>
    </div>
  );
}

function DownloadDeckButton({ data }: { data: any }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);
  async function download() {
    setBusy(true);
    setErr(false);
    try {
      const res = await fetch("/api/strategy/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("export failed");
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") || "";
      const name = /filename="?([^"]+)"?/.exec(cd)?.[1] || "strategy-deck.pptx";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setErr(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <button
      type="button"
      onClick={download}
      disabled={busy}
      className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-50"
      style={{ borderColor: "var(--lmi-accent)", color: "var(--lmi-accent)" }}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      {busy ? "Building deck…" : err ? "Retry download" : "Download deck (PPTX)"}
    </button>
  );
}

function leadLabel(m: string): string {
  return m === "truck" ? "Truck-involved fatal crashes" : m === "motorcycle" ? "Motorcycle fatalities" : "Traffic fatalities";
}
function yr(opp: any): string {
  return opp?.fars_year_min && opp?.fars_year_max ? `${opp.fars_year_min}–${opp.fars_year_max}` : "recent";
}

function Slide({ eyebrow, title, sub, tags, right, children }: { eyebrow: string; title: string; sub?: string; tags?: string[]; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-white p-8" style={{ borderColor: BORDER, background: LIGHT }}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: "var(--lmi-accent)" }}>{eyebrow}</div>
          <h3 className="mt-2 text-2xl font-bold md:text-3xl" style={{ color: NAVY }}>{title}</h3>
          {sub ? <div className="mt-1 text-sm" style={{ color: MUTED }}>{sub}</div> : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {right}
          {(tags ?? []).map((t) => <SourceChip key={t}>{t}</SourceChip>)}
        </div>
      </div>
      {children}
    </section>
  );
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-5 flex items-center gap-4 rounded-xl p-5 text-white" style={{ background: NAVY }}>
      <span className="h-9 w-1.5 shrink-0 rounded" style={{ background: "var(--lmi-accent-2)" }} />
      <span className="text-base font-medium">{children}</span>
    </div>
  );
}
