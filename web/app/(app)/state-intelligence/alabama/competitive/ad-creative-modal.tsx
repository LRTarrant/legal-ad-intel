"use client";

/* ------------------------------------------------------------------ */
/*  In-app ad-creative modal.                                          */
/*                                                                    */
/*  Renders REAL captured creative per channel, no link-out:          */
/*   - Paid Search → reconstructed Google text ad (pi_search_obs)     */
/*   - SEO         → organic SERP listing (serp_results_normalized)   */
/*   - Meta        → ad-library card from meta_ad_creatives.snapshot  */
/*   - YouTube     → honest "capture coming soon" (we store only a    */
/*                   transparency link today — PR 2 adds screenshots) */
/*                                                                    */
/*  Every field is read defensively; a malformed/empty creative       */
/*  degrades to a graceful fallback, never a thrown render.           */
/* ------------------------------------------------------------------ */

import { useEffect, useState } from "react";
import { X, ExternalLink, Loader2, Database, Play } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import type { ModalTarget } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface PaidCreative {
  ad_title: string | null;
  ad_description: string | null;
  ad_link: string | null;
  ad_position: number | null;
  case_type: string | null;
  advertiser_domain: string | null;
}

interface SeoCreative {
  title: string | null;
  snippet: string | null;
  link: string | null;
  position: number | null;
  query: string | null;
}

interface MetaCreative {
  ad_archive_id: string;
  page_name: string | null;
  case_type: string | null;
  is_active: boolean | null;
  start_date: string | null;
  end_date: string | null;
  snapshot: any;
}

function parseSnapshot(raw: unknown): any | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (typeof raw === "object") return raw;
  return null;
}

function displayHost(url: string | null | undefined): string {
  if (!url) return "";
  return url
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0];
}

export function AdCreativeModal({
  target,
  alMetroIds,
  onClose,
}: {
  target: ModalTarget | null;
  alMetroIds: string[];
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [paid, setPaid] = useState<PaidCreative[]>([]);
  const [seo, setSeo] = useState<SeoCreative[]>([]);
  const [meta, setMeta] = useState<MetaCreative[]>([]);

  // Escape to close + lock body scroll while open.
  useEffect(() => {
    if (!target) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [target, onClose]);

  // Fetch creative for the active target.
  useEffect(() => {
    if (!target) return;
    let active = true;
    const sb = getSupabase() as any;

    async function load() {
      setLoading(true);
      setPaid([]);
      setSeo([]);
      setMeta([]);
      try {
        if (target!.channel === "paid_search") {
          let q = sb
            .from("pi_search_observations")
            .select(
              "ad_title, ad_description, ad_link, ad_position, case_type, advertiser_domain, observed_date",
            )
            .eq("advertiser_domain", target!.domain)
            .order("observed_date", { ascending: false })
            .limit(40);
          if (alMetroIds.length) q = q.in("metro_id", alMetroIds);
          const { data } = await q;
          const rows = ((data as PaidCreative[] | null) ?? []).filter(
            (r) =>
              r.advertiser_domain !== "google.com" &&
              !(r.ad_link ?? "").includes("google.com/aclk") &&
              !(r.ad_link ?? "").includes("/goto"),
          );
          // Dedupe by title + link, keep the freshest dozen.
          const seen = new Set<string>();
          const unique: PaidCreative[] = [];
          for (const r of rows) {
            const key = `${r.ad_title}|${r.ad_link}`;
            if (seen.has(key)) continue;
            seen.add(key);
            unique.push(r);
            if (unique.length >= 12) break;
          }
          if (active) setPaid(unique);
        } else if (target!.channel === "seo") {
          const { data } = await sb
            .from("serp_results_normalized")
            .select("title, snippet, link, position, query, result_type")
            .eq("domain", target!.domain)
            .eq("result_type", "organic")
            .order("fetched_at", { ascending: false })
            .limit(30);
          const seen = new Set<string>();
          const unique: SeoCreative[] = [];
          for (const r of (data as SeoCreative[] | null) ?? []) {
            const key = r.link ?? r.title ?? "";
            if (seen.has(key)) continue;
            seen.add(key);
            unique.push(r);
            if (unique.length >= 12) break;
          }
          if (active) setSeo(unique);
        } else if (target!.channel === "meta") {
          const { data } = await sb
            .from("meta_ad_creatives")
            .select(
              "ad_archive_id, page_name, case_type, is_active, start_date, end_date, snapshot",
            )
            .eq("page_id", target!.pageId)
            .order("updated_at", { ascending: false })
            .limit(12);
          if (active) setMeta((data as MetaCreative[] | null) ?? []);
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [target, alMetroIds]);

  if (!target) return null;

  const channelLabel =
    target.channel === "paid_search"
      ? "Paid Search"
      : target.channel === "seo"
        ? "SEO"
        : target.channel === "meta"
          ? "Meta"
          : "YouTube";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${target.label} — ${channelLabel} creative`}
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        className="relative mt-4 w-full max-w-2xl rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 rounded-t-2xl border-b border-cloud bg-midnight-navy px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-intelligence-teal">
              {channelLabel} creative
            </p>
            <h3 className="mt-0.5 font-heading text-lg font-bold text-white">
              {target.label}
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] overflow-y-auto px-5 py-5">
          {loading ? (
            <div className="py-12 text-center">
              <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-intelligence-teal/60" />
              <p className="text-sm text-slate-gray">Loading creative…</p>
            </div>
          ) : target.channel === "youtube" ? (
            <YouTubeComingSoon
              label={target.label}
              arId={target.arId}
            />
          ) : target.channel === "paid_search" ? (
            <PaidCreatives rows={paid} />
          ) : target.channel === "seo" ? (
            <SeoCreatives rows={seo} />
          ) : (
            <MetaCreatives rows={meta} pageId={target.pageId} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- empty state ----------------------------- */

function EmptyCreative({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-cloud bg-cloud/40 p-8 text-center">
      <Database className="mx-auto mb-3 h-8 w-8 text-slate-gray/40" />
      <p className="text-sm font-medium text-midnight-navy/60">{message}</p>
    </div>
  );
}

/* ----------------------------- Paid Search ----------------------------- */

function PaidCreatives({ rows }: { rows: PaidCreative[] }) {
  if (rows.length === 0) {
    return (
      <EmptyCreative message="No paid-search creative captured for this firm in Alabama yet." />
    );
  }
  return (
    <div className="space-y-3">
      {rows.map((r, i) => (
        <div
          key={i}
          className="rounded-lg border border-cloud bg-white p-4 shadow-sm"
        >
          <div className="mb-1 flex items-center gap-2">
            <span className="rounded bg-cloud px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-gray">
              Ad
            </span>
            <span className="text-xs text-slate-gray">
              {displayHost(r.ad_link) || r.advertiser_domain}
            </span>
            {r.ad_position != null && (
              <span className="ml-auto text-[11px] text-slate-gray/70">
                pos #{r.ad_position}
              </span>
            )}
          </div>
          <a
            href={r.ad_link ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[17px] font-medium leading-snug text-[#1a0dab] hover:underline"
          >
            {r.ad_title ?? "(untitled ad)"}
          </a>
          {r.ad_description && (
            <p className="mt-1 text-[13px] leading-relaxed text-slate-gray">
              {r.ad_description}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

/* -------------------------------- SEO --------------------------------- */

function SeoCreatives({ rows }: { rows: SeoCreative[] }) {
  if (rows.length === 0) {
    return (
      <EmptyCreative message="No organic SERP listings captured for this firm yet." />
    );
  }
  return (
    <div className="space-y-3">
      {rows.map((r, i) => (
        <div
          key={i}
          className="rounded-lg border border-cloud bg-white p-4 shadow-sm"
        >
          <div className="mb-1 flex items-center gap-2">
            <span className="text-xs text-emerald-700">
              {displayHost(r.link)}
            </span>
            {r.position != null && (
              <span className="ml-auto text-[11px] text-slate-gray/70">
                rank #{r.position}
              </span>
            )}
          </div>
          <a
            href={r.link ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[17px] font-medium leading-snug text-[#1a0dab] hover:underline"
          >
            {r.title ?? "(untitled result)"}
          </a>
          {r.snippet && (
            <p className="mt-1 text-[13px] leading-relaxed text-slate-gray">
              {r.snippet}
            </p>
          )}
          {r.query && (
            <p className="mt-2 text-[11px] text-slate-gray/60">
              Ranked for &ldquo;{r.query}&rdquo;
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

/* -------------------------------- Meta -------------------------------- */

function MetaCreatives({
  rows,
  pageId,
}: {
  rows: MetaCreative[];
  pageId: string;
}) {
  const cards = rows
    .map((r) => ({ row: r, snap: parseSnapshot(r.snapshot) }))
    .filter((c) => c.snap);

  if (cards.length === 0) {
    return (
      <div className="space-y-3">
        <EmptyCreative message="Creative preview unavailable for this firm right now." />
        <a
          href={`https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&view_all_page_id=${pageId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm font-medium text-intelligence-teal hover:underline"
        >
          Open this firm in the Meta Ad Library
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {cards.map(({ row, snap }, i) => {
        const body: string | undefined = snap?.body?.text ?? snap?.body;
        const title: string | undefined = snap?.title;
        const caption: string | undefined =
          snap?.caption ?? snap?.link_description;
        const cta: string | undefined = snap?.cta_text;
        const linkUrl: string | undefined = snap?.link_url;
        const video = Array.isArray(snap?.videos) ? snap.videos[0] : null;
        const image = Array.isArray(snap?.images) ? snap.images[0] : null;
        const poster: string | undefined =
          video?.video_preview_image_url ??
          image?.original_image_url ??
          image?.resized_image_url;
        const videoSrc: string | undefined =
          video?.video_hd_url ?? video?.video_sd_url;
        const profile: string | undefined = snap?.page_profile_picture_url;

        return (
          <div
            key={row.ad_archive_id ?? i}
            className="overflow-hidden rounded-lg border border-cloud bg-white shadow-sm"
          >
            {/* page row */}
            <div className="flex items-center gap-2 px-4 pt-3">
              {profile ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile}
                  alt=""
                  className="h-8 w-8 rounded-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cloud text-xs font-bold text-slate-gray">
                  {(row.page_name ?? "?").charAt(0)}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-midnight-navy">
                  {row.page_name ?? "Unknown page"}
                </p>
                <p className="text-[11px] text-slate-gray/70">Sponsored</p>
              </div>
              {row.is_active && (
                <span className="ml-auto rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                  Active
                </span>
              )}
            </div>

            {/* body copy */}
            {body && (
              <p className="px-4 pt-2 text-[13px] leading-relaxed text-midnight-navy/90">
                {body}
              </p>
            )}

            {/* media */}
            {poster ? (
              <div className="relative mt-3 bg-cloud/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={poster}
                  alt={title ?? "ad creative"}
                  className="max-h-80 w-full object-contain"
                  onError={(e) => {
                    (
                      e.currentTarget.parentElement as HTMLElement
                    ).style.display = "none";
                  }}
                />
                {videoSrc && (
                  <a
                    href={videoSrc}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute inset-0 flex items-center justify-center"
                    aria-label="Play video"
                  >
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/55 text-white">
                      <Play className="h-5 w-5 translate-x-0.5" fill="currentColor" />
                    </span>
                  </a>
                )}
              </div>
            ) : null}

            {/* link card footer */}
            {(title || caption || cta) && (
              <div className="flex items-center gap-3 border-t border-cloud bg-cloud/30 px-4 py-3">
                <div className="min-w-0 flex-1">
                  {caption && (
                    <p className="truncate text-[11px] uppercase tracking-wide text-slate-gray/70">
                      {displayHost(linkUrl) || caption}
                    </p>
                  )}
                  {title && (
                    <p className="truncate text-sm font-semibold text-midnight-navy">
                      {title}
                    </p>
                  )}
                </div>
                {cta && (
                  <span className="shrink-0 rounded-md bg-cloud px-3 py-1.5 text-xs font-semibold text-midnight-navy">
                    {cta}
                  </span>
                )}
              </div>
            )}

            {/* meta footer */}
            <div className="flex items-center gap-2 px-4 py-2 text-[11px] text-slate-gray/70">
              {row.case_type && (
                <span className="rounded-full bg-intelligence-teal/10 px-2 py-0.5 font-medium text-intelligence-teal">
                  {row.case_type.replace(/_/g, " ")}
                </span>
              )}
              {(row.start_date || row.end_date) && (
                <span className="ml-auto">
                  {row.start_date ?? "?"} → {row.end_date ?? "active"}
                </span>
              )}
            </div>
          </div>
        );
      })}
      <a
        href={`https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&view_all_page_id=${pageId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs font-medium text-slate-gray hover:text-intelligence-teal"
      >
        See all of this firm&apos;s ads in the Meta Ad Library
        <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}

/* ------------------------------- YouTube ------------------------------ */

function YouTubeComingSoon({
  label,
  arId,
}: {
  label: string;
  arId: string | null;
}) {
  return (
    <div className="rounded-lg border border-cloud bg-cloud/40 p-8 text-center">
      <Play className="mx-auto mb-3 h-8 w-8 text-slate-gray/40" />
      <p className="text-sm font-medium text-midnight-navy/70">
        Video-creative preview for {label} is coming soon.
      </p>
      <p className="mx-auto mt-1 max-w-sm text-xs text-slate-gray">
        We track this firm&apos;s active YouTube ads today; in-app playback of the
        creative is being wired up.
      </p>
      {arId && (
        <a
          href={`https://adstransparency.google.com/advertiser/${arId}?region=US`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-intelligence-teal hover:underline"
        >
          View on Google Ads Transparency
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
    </div>
  );
}
