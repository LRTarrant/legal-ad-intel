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

import { useState, useMemo, type CSSProperties } from "react";
import { Download, Loader2 } from "lucide-react";
import { buildCampaignBuilderHandoff } from "@/lib/strategy-engine/campaign-handoff";
import CriteriaSection from "@/components/CriteriaSection";
import {
  computeEconomics,
  type ClickToLeadLever,
  type LeadToSignedLever,
  type Confidence,
} from "@/lib/strategy-engine/economics";

/* eslint-disable @typescript-eslint/no-explicit-any */

const NAVY = "#0B1D3A";
const LIGHT = "#F4F7FA";
const BORDER = "#DCE4ED";
const MUTED = "#5C6E86";
const LABEL = "#8696AC";
const CHIP = "#E9EFF5";
// Readiness "fix first" warning state (new): a restrained amber tint in the
// DESIGN.md warning hue, kept quiet for a briefing surface. WARN_INK on
// WARN_TINT clears WCAG AA (~7:1).
const WARN_TINT = "#FBE9CC";
const WARN_INK = "#8A5A00";

const mono = "ui-monospace, SFMono-Regular, Menlo, monospace";

function pretty(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

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

/* Readiness gate: "fix first" carries a restrained warning tint (the firm said
 * they lack it); "confirm" is a quiet neutral (unverified). Tinted-bg + darker-
 * hue text mirrors statusPill; no loud alert red — quiet authority. */
function readinessPill(missing: boolean) {
  return missing ? (
    // Warning tint (new semantic state; DESIGN.md warning hue, restrained for a briefing surface).
    <span className="rounded px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide" style={{ background: WARN_TINT, color: WARN_INK }}>Fix first</span>
  ) : (
    <span className="rounded px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide" style={{ background: CHIP, color: MUTED }}>Confirm</span>
  );
}

/* Compact, glanceable key for the two vocabularies the white-space section and
 * the recommendation cards share: contention (open/contested/defended) and
 * confidence (measured vs modeled). One place, not a tooltip on every row. */
function WhitespaceLegend() {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 border-t pt-3 text-[11px]" style={{ borderColor: BORDER, color: MUTED }}>
      <span style={{ fontFamily: mono, color: LABEL }} className="uppercase tracking-wide">Key</span>
      <span>
        <b style={{ color: NAVY }}>Open / Contested / Defended</b> — competing firms in the channel: few / some / many.
      </span>
      <span>
        <b style={{ color: NAVY }}>Measured</b> = counted from live ad data · <b style={{ color: NAVY }}>Modeled</b> = estimated from ad-library coverage.
      </span>
    </div>
  );
}

export default function StrategyDeck({ data }: { data: any }) {
  const brand = data.brand ?? {};
  const accent = brand.primary_color || "#1A8C96";
  const accent2 = brand.accent_color || "#3FBEC8";
  const rootStyle = { ["--lmi-accent" as any]: accent, ["--lmi-accent-2" as any]: accent2 } as CSSProperties;

  const counties = data.opportunity?.counties ?? [];
  const maxTruck = Math.max(1, ...counties.map((c: any) => c.truck_fatalities || 0));
  const recs = data.recommendations ?? [];
  // Widened handoff (PHASE 1): named market, firm, budget range, and goal ride
  // the URL so the user lands ready to generate. Statewide is first-class; the
  // two unmapped case types (nursing_home, workers_comp) get an honest block.
  const handoff = buildCampaignBuilderHandoff(data);

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
      <Slide eyebrow="Competitive landscape" title="The competitive field" sub="Who's advertising in the market, ranked by sustained presence (market breadth + recent activity)" tags={["pi_search"]}>
        <p className="mb-3 text-[11px]" style={{ fontFamily: mono, color: LABEL }}>Ranked across paid-search presence (pi_search observations, per DMA).</p>
        <CompetitiveTable advertisers={data.competitive?.advertisers ?? []} />
        <p className="mt-3 text-[11px]" style={{ color: MUTED }}>Presence share weights sustained market presence — geographic breadth first, then recent activity — the same ranking as the Competitive Analysis tab, so a dense burst in one or two metros doesn&rsquo;t read as market dominance. No estimated dollar spend is shown: per-firm spend isn&rsquo;t reliably sourceable for local PI.</p>
      </Slide>

      {/* 5. INSIDE THEIR ADS */}
      {(data.competitive?.creative ?? []).length > 0 ? (
        <Slide eyebrow="Ad intelligence" title="Inside their ads" sub="A sample of real creative from tracked competitors" tags={["pi_search", "youtube"]}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(data.competitive.creative as any[]).slice(0, 6).map((c, i) => (
              <a
                key={i}
                href={c.link || undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col overflow-hidden rounded-xl border bg-white"
                style={{ borderColor: BORDER }}
              >
                <div className="relative flex h-28 items-center justify-center" style={{ background: NAVY }}>
                  {c.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.image_url} alt={c.advertiser ?? "ad creative"} className="h-full w-full object-cover" />
                  ) : (
                    <span style={{ fontFamily: mono, color: "#7D90AC" }} className="text-[11px] uppercase tracking-widest">Search ad</span>
                  )}
                  <span className="absolute right-2 top-2 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white" style={{ background: "var(--lmi-accent)", fontFamily: mono }}>{c.format_label}</span>
                </div>
                <div className="flex flex-1 flex-col gap-1 p-4">
                  <div className="text-sm font-semibold" style={{ color: NAVY }}>{c.advertiser ?? c.advertiser_domain}</div>
                  {c.headline ? <div className="text-[13px]" style={{ color: "#3A4D67" }}>{c.headline}</div> : null}
                  {c.advertiser_domain ? <div className="mt-auto text-[11px]" style={{ color: MUTED }}>{c.advertiser_domain}</div> : null}
                </div>
              </a>
            ))}
          </div>
          <p className="mt-3 text-[11px]" style={{ color: MUTED }}>Real captured creative — YouTube video ads from in-state firms (durable thumbnails) and live paid-search headlines. Click a card to view the source.</p>
        </Slide>
      ) : null}

      {/* 6. WHITE SPACE */}
      <Slide eyebrow="Competitive landscape" title="Where the white space is" tags={["ad library"]}>
        <WhitespaceChannels channels={data.competitive?.channels ?? []} advertisers={data.competitive?.advertisers ?? []} />
        <WhitespaceLegend />
      </Slide>

      {/* 6a. QUALIFY THE LEAD (PI intake criteria) — bridges white space to the
           product: winning the click is only half of it; the tie-in points at
           the lead→signed lever in "What your budget buys" below. The tie-in is
           gated on data.economics (same condition as the EconomicsSection at
           ~:327) so it never references a section that didn't render — e.g. on
           the nursing_home/workers_comp path where economics is null. */}
      {data.criteria ? (
        <CriteriaSection
          criteria={data.criteria}
          tieIn={
            data.economics
              ? `Good qualification is what moves your lead-to-signed rate — the biggest lever in "What your budget buys" below.`
              : undefined
          }
        />
      ) : null}

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
            {(["opportunity", "white_space", "fit"] as const).map((k, idx) => {
              const lnk = r[k];
              const isWhite = k === "white_space";
              const modeled = isWhite && lnk.depth === "modeled";
              return (
                <div key={k} className="relative rounded-xl border bg-white p-6" style={{ borderColor: BORDER }}>
                  <div className="absolute -top-3 left-6 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: "var(--lmi-accent)" }}>{idx + 1}</div>
                  <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--lmi-accent)" }}>{k.replace("_", " ")}</div>
                  {isWhite ? (
                    // White space matches the section: a status pill (open/contested/
                    // defended) plus the real firm count when measured, or a quiet
                    // "Modeled" tag when inferred — never the word "unmeasured".
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {statusPill(lnk.status ?? "open")}
                      {modeled ? (
                        <span className="rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ background: CHIP, color: MUTED }}>Modeled</span>
                      ) : (
                        <span className="text-lg font-bold" style={{ color: NAVY }}>{lnk.value} active</span>
                      )}
                    </div>
                  ) : (
                    <div className="mt-2 text-3xl font-bold leading-none" style={{ color: NAVY }}>{lnk.value}</div>
                  )}
                  <div className="mt-2 text-sm" style={{ color: "#3A4D67" }}>{lnk.text}</div>
                </div>
              );
            })}
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
          {(data.integrated_plan?.allocation ?? []).map((a: any, i: number) => (
            <div key={i} className="flex items-center gap-4">
              <div className="w-52 text-sm font-semibold" style={{ color: NAVY }}>{a.label} <span style={{ color: MUTED }} className="font-normal">({a.stage})</span></div>
              <div className="h-6 flex-1 rounded" style={{ background: "#E4EBF2" }}><div className="h-full rounded" style={{ width: `${a.pct}%`, background: "var(--lmi-accent)" }} /></div>
              <div className="w-12 text-right font-bold" style={{ color: NAVY }}>{a.pct}%</div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm" style={{ color: MUTED }}>{data.prose?.channel_narrative}</p>
      </Slide>

      {/* 11a. WHAT YOUR BUDGET BUYS (PI economics) */}
      {data.economics ? <EconomicsSection economics={data.economics} /> : null}

      {/* 11b. BEFORE YOU SPEND A DOLLAR */}
      {(data.readiness ?? []).length > 0 ? (
        <Slide eyebrow="Before you spend a dollar" title="Foundation check" sub="A media plan is only as strong as the funnel it points at.">
          <div className="space-y-1">
            {(data.readiness ?? []).map((r: any, i: number) => {
              const missing = r.status === "missing";
              return (
                <div key={i} className="flex items-center gap-4 rounded-lg border-b px-3 py-3" style={{ borderColor: "#E0E7EF" }}>
                  <div className="w-20 shrink-0">{readinessPill(missing)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="text-base font-semibold" style={{ color: NAVY }}>{r.label}</div>
                    {(r.tactics ?? []).length > 0 ? (
                      <div className="mt-0.5 text-sm" style={{ color: MUTED }}>Needed for {r.tactics.join(", ")}</div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3">
            <span style={{ fontFamily: mono, color: LABEL }} className="text-[11px]">Close the “fix first” items before scaling spend; confirm the rest.</span>
          </div>
        </Slide>
      ) : null}

      {/* 12. HANDOFF */}
      <section className="rounded-2xl p-10 text-white" style={{ background: NAVY }}>
        <div className="text-sm font-bold tracking-[0.22em]" style={{ color: "var(--lmi-accent-2)" }}>HANDOFF</div>
        <h2 className="mt-4 text-3xl font-bold md:text-4xl">Turn this strategy into a campaign</h2>
        <p className="mt-3 max-w-2xl text-lg" style={{ color: "#9FB1C7" }}>{data.prose?.approach_rationale}</p>
        {handoff.href ? (
          <a href={handoff.href} className="mt-6 inline-block rounded-lg px-6 py-3 text-sm font-bold text-white" style={{ background: "var(--lmi-accent)" }}>
            Continue in Campaign Builder →
          </a>
        ) : (
          <div className="mt-6 max-w-2xl rounded-lg border border-white/15 bg-white/10 px-5 py-4 text-sm" style={{ color: "#D7E0EC" }}>
            Campaign Builder support for nursing home and workers&rsquo; comp campaigns is coming soon — these case types aren&rsquo;t in the PI campaign flow yet.
          </div>
        )}
      </section>
    </div>
  );
}

/* ── Competitive field: firm→link + show-more ───────────────────────────── */

function FirmName({ a }: { a: any }) {
  const url = a.domain ? `https://${a.domain}` : null;
  const label = `${a.rank}. ${a.name}`;
  return url ? (
    <a href={url} target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: NAVY }}>{label}</a>
  ) : (
    <span style={{ color: NAVY }}>{label}</span>
  );
}

function CompetitiveTable({ advertisers }: { advertisers: any[] }) {
  const [showAll, setShowAll] = useState(false);
  const rows = showAll ? advertisers : advertisers.slice(0, 6);
  return (
    <>
      <table className="w-full text-left text-sm">
        <thead><tr className="border-b-2 text-xs uppercase" style={{ borderColor: "#C9D4E0", color: LABEL, fontFamily: mono }}>
          <th className="py-2">Firm</th><th className="text-right">Presence share</th>
        </tr></thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a.name} className="border-b" style={{ borderColor: "#E0E7EF" }}>
              <td className="py-3 text-base font-semibold"><FirmName a={a} /></td>
              <td className="py-3"><div className="ml-auto flex w-48 items-center gap-3">
                <div className="h-3.5 flex-1 rounded-full" style={{ background: "#E4EBF2" }}><div className="h-full rounded-full" style={{ width: `${Math.round(a.share * 100)}%`, background: "var(--lmi-accent)" }} /></div>
                <span className="w-10 text-right font-bold" style={{ color: NAVY }}>{Math.round(a.share * 100)}%</span>
              </div></td>
            </tr>
          ))}
        </tbody>
      </table>
      {advertisers.length > 6 ? (
        <button type="button" onClick={() => setShowAll((v) => !v)} className="mt-3 text-sm font-semibold hover:underline" style={{ color: "var(--lmi-accent)" }}>
          {showAll ? "Show fewer" : `Show all ${advertisers.length} firms`}
        </button>
      ) : null}
    </>
  );
}

/* ── White space: reveal the paid-search defenders (same pi_search roster) ─── */

function WhitespaceChannels({ channels, advertisers }: { channels: any[]; advertisers: any[] }) {
  const [openCh, setOpenCh] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      {channels.map((c) => {
        // Only the measured paid-search channel can name defenders — it shares the
        // pi_search roster shown above. seo (a different serp roster) and modeled
        // channels stay count-only; never fabricate names.
        const canName = c.channel === "search" && c.measured && c.status !== "open" && advertisers.length > 0;
        const expanded = openCh === c.channel;
        return (
          <div key={c.channel} className="rounded-lg border-b px-3 py-3" style={{ borderColor: "#E0E7EF", background: c.status === "open" ? "#EAF6F6" : undefined }}>
            <div className="flex items-center gap-4">
              <div className="w-56 text-base font-semibold" style={{ color: NAVY }}>{c.label}{!c.measured ? " (modeled)" : ""}</div>
              <div className="w-28">{statusPill(c.status)}</div>
              <div className="flex-1 text-sm" style={{ color: c.status === "open" ? "#14707A" : MUTED }}>
                {c.status === "open" ? "No PI firm present" : `${c.active_firms} firm${c.active_firms === 1 ? "" : "s"} active`}
                {canName ? (
                  <button type="button" onClick={() => setOpenCh(expanded ? null : c.channel)} className="ml-2 font-semibold hover:underline" style={{ color: "var(--lmi-accent)" }}>
                    {expanded ? "hide firms" : "who?"}
                  </button>
                ) : null}
              </div>
            </div>
            {canName && expanded ? (
              <div className="mt-2 text-[13px]" style={{ color: "#3A4D67" }}>
                <span style={{ color: MUTED }}>Active firms include: </span>
                {advertisers.map((a: any, i: number) => (
                  <span key={a.name}>{i > 0 ? " · " : ""}{a.name}</span>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/* ── PI economics: what the budget buys (live-lever funnel) ──────────────── */

const usd = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
// Nearest $100 with a ~ prefix — modeled costs shouldn't read as false precision.
const usdApprox = (n: number) => "~$" + (Math.round(n / 100) * 100).toLocaleString("en-US");
const shorten = (s: string, n = 22) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

const CONF_STYLE: Record<Confidence, { label: string; bg: string; color: string }> = {
  high: { label: "High conf.", bg: "#ECFDF5", color: "#10B981" },
  medium: { label: "Medium conf.", bg: CHIP, color: MUTED },
  low: { label: "Low conf.", bg: WARN_TINT, color: WARN_INK },
  very_low: { label: "Very low conf.", bg: WARN_TINT, color: WARN_INK },
};

function ConfidencePill({ c }: { c: Confidence | null | undefined }) {
  if (!c) return null;
  const s = CONF_STYLE[c];
  return (
    <span className="rounded px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide" style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

function FunnelStage({ n, label, value, note, chip, conf, highlight }: {
  n: number; label: string; value: string; note: string;
  chip?: string | null; conf?: Confidence | null; highlight?: boolean;
}) {
  return (
    <div className="relative rounded-xl border bg-white p-4" style={{ borderColor: highlight ? "var(--lmi-accent)" : BORDER, borderWidth: highlight ? 2 : 1 }}>
      <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--lmi-accent)" }}>{n}. {label}</div>
      <div className="mt-1 text-2xl font-bold leading-none" style={{ color: NAVY }}>{value}</div>
      <div className="mt-1 text-[11px]" style={{ color: MUTED }}>{note}</div>
      {chip || conf ? (
        <div className="mt-2 flex flex-wrap items-center gap-1">
          {chip ? (
            <span title={chip} style={{ fontFamily: mono, background: CHIP, border: `1px solid ${BORDER}`, color: "#4A5E78" }} className="rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wide">
              {shorten(chip)}
            </span>
          ) : null}
          <ConfidencePill c={conf} />
        </div>
      ) : null}
    </div>
  );
}

function LeverToggle<T extends string>({ label, options, value, onChange, caveat }: {
  label: string;
  options: { key: T; label: string; pct: number }[];
  value: T;
  onChange: (v: T) => void;
  caveat?: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--lmi-accent)" }}>{label}</span>
        <span className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white" style={{ background: "var(--lmi-accent)" }}>your lever</span>
      </div>
      <div className="flex gap-2">
        {options.map((o) => {
          const on = o.key === value;
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => onChange(o.key)}
              className="flex-1 rounded-lg border px-3 py-2 text-left transition-colors"
              style={{ background: on ? NAVY : "#fff", borderColor: on ? NAVY : BORDER }}
            >
              <div className="text-sm font-semibold" style={{ color: on ? "#fff" : NAVY }}>{o.label}</div>
              <div className="text-xs font-mono" style={{ color: on ? "var(--lmi-accent-2)" : MUTED }}>{o.pct}%</div>
            </button>
          );
        })}
      </div>
      {caveat ? <p className="mt-1.5 text-[11px]" style={{ color: MUTED }}>{caveat}</p> : null}
    </div>
  );
}

const ECON_CASE_LABEL: Record<string, string> = { auto: "Auto", trucking: "Trucking", motorcycle: "Motorcycle" };
const ECON_TIER_LABEL: Record<string, string> = { tier_1: "major metro", tier_2: "mid-size market", small: "small market" };

function EconomicsSection({ economics }: { economics: any }) {
  const b = economics.benchmark;
  const [clickToLead, setClickToLead] = useState<ClickToLeadLever>(economics.default_result?.levers?.clickToLead ?? "competent");
  const [leadToSigned, setLeadToSigned] = useState<LeadToSignedLever>(economics.default_result?.levers?.leadToSigned ?? "average");
  const r = useMemo(
    () => computeEconomics(b, economics.monthly_spend.mid, { clickToLead, leadToSigned }),
    [b, economics.monthly_spend.mid, clickToLead, leadToSigned],
  );
  const f = r.funnel;
  const prov = b.provenance;
  const caseLabel = ECON_CASE_LABEL[r.case_type] ?? r.case_type;
  const caseLower = caseLabel.toLowerCase();
  const tierLabel = ECON_TIER_LABEL[r.market_tier] ?? r.market_tier;

  return (
    <Slide
      eyebrow="What your budget buys"
      title="Realistic cost per signed case"
      sub={`${caseLabel} · ${tierLabel} · at ${usd(economics.monthly_spend.min)}–${usd(economics.monthly_spend.max)}/mo`}
      tags={["modeled", prov.reported_vs_estimate ?? "estimate"]}
    >
      {/* Headline — frames the LEVER RANGE, not a single number */}
      <div className="rounded-xl p-6 text-white" style={{ background: NAVY }}>
        <div className="text-sm" style={{ color: "#9FB1C7" }}>
          At <b className="text-white">{leadToSigned}</b> intake, {usd(economics.monthly_spend.mid)}/mo buys about
        </div>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-4xl font-bold">{f.signed_cases}</span>
          <span className="text-lg" style={{ color: "var(--lmi-accent-2)" }}>signed {caseLower} {f.signed_cases === 1 ? "case" : "cases"}/mo</span>
          <span className="text-2xl font-bold">at {usdApprox(r.cost_per_case_typical)}/case</span>
        </div>
        <div className="mt-3 text-sm" style={{ color: "#AEBDD0" }}>
          Intake quality is the variable you control:{" "}
          <b className="text-white">{usdApprox(r.lever_best_cost_per_case)}/case</b> at elite intake →{" "}
          <b className="text-white">{usdApprox(r.lever_worst_cost_per_case)}/case</b> at poor intake. Move the levers below.
        </div>
      </div>

      {/* The visible funnel — the credibility */}
      <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <FunnelStage n={1} label="Monthly spend" value={usd(f.monthly_spend)} note="your budget midpoint" />
        <FunnelStage n={2} label="Clicks" value={String(f.clicks)} note={`at ${usd(f.cpc)} CPC`} chip={prov.cpc_source} conf={prov.cpc_confidence} />
        <FunnelStage n={3} label="Leads" value={String(f.leads)} note={`${f.click_to_lead_pct}% click→lead`} chip={prov.conversion_source} conf={prov.click_to_lead_confidence} />
        <FunnelStage n={4} label="Signed cases" value={String(f.signed_cases)} note={`${f.lead_to_signed_pct}% lead→signed`} conf={prov.lead_to_signed_confidence} />
        <FunnelStage n={5} label="Cost / case" value={usdApprox(r.cost_per_case_typical)} note={`${usdApprox(r.cost_per_case_low)} – ${usdApprox(r.cost_per_case_high)}`} highlight />
      </div>

      {/* Levers — prominent and obviously interactive (the point of the section) */}
      <div className="mt-5 grid gap-5 rounded-xl border bg-white p-5 sm:grid-cols-2" style={{ borderColor: BORDER }}>
        <LeverToggle
          label="Click → lead"
          value={clickToLead}
          onChange={setClickToLead}
          options={[
            { key: "weak", label: "Weak", pct: b.click_to_lead.weak },
            { key: "competent", label: "Competent", pct: b.click_to_lead.competent },
            { key: "strong", label: "Strong", pct: b.click_to_lead.strong },
          ]}
        />
        <LeverToggle
          label="Lead → signed"
          value={leadToSigned}
          onChange={setLeadToSigned}
          options={[
            { key: "poor", label: "Poor", pct: b.lead_to_signed.poor },
            { key: "average", label: "Average", pct: b.lead_to_signed.average },
            { key: "elite", label: "Elite", pct: b.lead_to_signed.elite },
          ]}
          caveat="The softest input, and the one you most control. Depends on your intake — tighten callback speed and qualification to move it."
        />
      </div>

      {/* ROI context — fee-per-case inline with cost-per-case */}
      {r.case_value_median != null ? (
        <div className="mt-5 rounded-xl border p-5" style={{ borderColor: BORDER, background: r.fee_covers_acquisition ? "#ECFDF5" : WARN_TINT }}>
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 text-sm">
            <div><span style={{ color: MUTED }}>Median case value </span><b style={{ color: NAVY }}>{usd(r.case_value_median)}</b></div>
            <div><span style={{ color: MUTED }}>Fee per case ({b.contingency_presuit_pct}%) </span><b style={{ color: NAVY }}>{r.fee_per_case != null ? usd(r.fee_per_case) : "—"}</b></div>
            <div><span style={{ color: MUTED }}>Cost per case </span><b style={{ color: NAVY }}>{usdApprox(r.cost_per_case_typical)}</b></div>
          </div>
          <p className="mt-2 text-sm font-medium" style={{ color: r.fee_covers_acquisition ? "#14707A" : WARN_INK }}>
            {r.fee_covers_acquisition
              ? `At this intake level the average ${caseLower} case fee covers acquisition — the economics work.`
              : `The average ${caseLower} case fee does NOT cover this acquisition cost. Move the levers toward elite intake, or use cheaper channels than paid search.`}
          </p>
          {r.case_value_tail != null && r.case_value_tail_note ? (
            <p className="mt-1 text-[11px]" style={{ color: MUTED }}>Tail: {usd(r.case_value_tail)}+ — {r.case_value_tail_note}.</p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-1">
            {prov.case_value_source ? <SourceChip>{shorten(prov.case_value_source, 34)}</SourceChip> : null}
            <ConfidencePill c={prov.case_value_confidence} />
          </div>
        </div>
      ) : null}

      {/* Honesty footer */}
      {!r.plausible ? (
        <p className="mt-3 text-[11px] font-medium" style={{ color: WARN_INK }}>
          This cost-per-case lands outside the usual band — treat it as a rough signal, not a quote.
        </p>
      ) : null}
      {prov.source_notes ? <p className="mt-3 text-[11px]" style={{ color: MUTED }}>{prov.source_notes}</p> : null}
      <p className="mt-1 text-[11px]" style={{ fontFamily: mono, color: LABEL }}>
        Modeled from keyword-level CPC × your intake rates — directional ranges, not a quote. CPC and case value are fixed by market; the two conversion rates are yours to set.
      </p>
    </Slide>
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
