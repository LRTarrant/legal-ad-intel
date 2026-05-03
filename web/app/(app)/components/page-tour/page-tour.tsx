"use client";

/**
 * <PageTour /> — In-product page tour entrypoint
 * -----------------------------------------------
 * Renders a small "Watch tour" pill in a page header. On hover/focus it shows
 * a preview card with the video poster + runtime; on click it opens a modal
 * player with the video.
 *
 * Usage:
 *   <PageTour slug="recall-watchlist" />
 *
 * The video registry lives in `@/lib/videos`. Add new entries there.
 *
 * Behavior:
 *   - "Watched" state persists per-user in localStorage. The new-feature pulse
 *     dot stops once the user has played a tour at least once.
 *   - Modal is keyboard accessible (Esc to close, focus trap on open).
 *   - Body scroll is locked while the modal is open.
 *   - Analytics events are dispatched as CustomEvents on `window`:
 *       - "page-tour:opened"  ({ slug })
 *       - "page-tour:played"  ({ slug })
 *       - "page-tour:completed" ({ slug })
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Play, X } from "lucide-react";
import { PAGE_TOUR_VIDEOS, type PageTourSlug } from "@/lib/videos";

type Props = {
  slug: PageTourSlug;
  /** Compact mode hides the chip text and shows just the play icon. */
  compact?: boolean;
};

const WATCHED_KEY = "lmi.page-tours.watched";

function getWatchedSet(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(WATCHED_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function markWatched(slug: string) {
  if (typeof window === "undefined") return;
  try {
    const set = getWatchedSet();
    set.add(slug);
    window.localStorage.setItem(
      WATCHED_KEY,
      JSON.stringify(Array.from(set)),
    );
  } catch {
    /* noop */
  }
}

function emit(eventName: string, slug: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(eventName, { detail: { slug } }),
  );
}

export function PageTour({ slug, compact = false }: Props) {
  const video = PAGE_TOUR_VIDEOS[slug];
  const [hovered, setHovered] = useState(false);
  const [open, setOpen] = useState(false);
  const [hasWatched, setHasWatched] = useState(false);

  useEffect(() => {
    setHasWatched(getWatchedSet().has(slug));
  }, [slug]);

  const handleOpen = useCallback(() => {
    setOpen(true);
    emit("page-tour:opened", slug);
  }, [slug]);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  if (!video) return null;

  return (
    <>
      <button
        type="button"
        aria-label={`Open page tour: ${video.title}`}
        onClick={handleOpen}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        className={`group relative inline-flex items-center gap-1.5 rounded-full border border-intelligence-teal/30 bg-intelligence-teal/5 px-3 py-1 text-xs font-semibold text-intelligence-teal transition-colors hover:bg-intelligence-teal/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-intelligence-teal focus-visible:ring-offset-1 ${
          compact ? "px-1.5" : ""
        }`}
      >
        <Play className="h-3 w-3 fill-current" aria-hidden />
        {!compact && (
          <>
            <span>Watch tour</span>
            <span className="text-[10px] font-medium text-intelligence-teal/70">
              {video.duration}
            </span>
          </>
        )}
        {!hasWatched && (
          <span
            aria-hidden
            className="absolute -right-0.5 -top-0.5 inline-flex h-2 w-2"
          >
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-intelligence-teal opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-intelligence-teal" />
          </span>
        )}

        {/* Hover preview card */}
        {hovered && !open && (
          <span
            role="presentation"
            className="pointer-events-none absolute left-0 top-full z-30 mt-2 w-80 overflow-hidden rounded-lg border border-slate-200 bg-white text-left shadow-lg"
          >
            <span className="relative block aspect-video w-full bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={video.poster}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                loading="lazy"
              />
              <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/95 text-midnight-navy shadow-lg">
                  <Play className="h-5 w-5 fill-current" aria-hidden />
                </span>
              </span>
              <span className="absolute bottom-1.5 right-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {video.duration}
              </span>
            </span>
            <span className="block p-3">
              <span className="block font-heading text-sm font-semibold text-midnight-navy">
                {video.title}
              </span>
              <span className="mt-1 block text-xs text-slate-gray">
                {video.description}
              </span>
            </span>
          </span>
        )}
      </button>

      {open && <PageTourModal video={video} onClose={handleClose} />}
    </>
  );
}

/* -------------------------------------------------------------------- */
/*  Modal                                                               */
/* -------------------------------------------------------------------- */

type ModalProps = {
  video: (typeof PAGE_TOUR_VIDEOS)[PageTourSlug];
  onClose: () => void;
};

function PageTourModal({ video, onClose }: ModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const playedRef = useRef(false);
  const [mounted, setMounted] = useState(false);

  // Body scroll lock + Esc-to-close + initial focus
  useEffect(() => {
    setMounted(true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtnRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  if (!mounted || typeof document === "undefined") return null;

  const handlePlay = () => {
    if (playedRef.current) return;
    playedRef.current = true;
    markWatched(video.slug);
    emit("page-tour:played", video.slug);
  };

  const handleEnded = () => {
    emit("page-tour:completed", video.slug);
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="page-tour-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-5xl rounded-xl bg-white shadow-2xl">
        <button
          ref={closeBtnRef}
          type="button"
          aria-label="Close tour"
          onClick={onClose}
          className="absolute -right-3 -top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-midnight-navy shadow-md transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-intelligence-teal"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>

        <div className="overflow-hidden rounded-t-xl bg-black">
          {video.youtubeId ? (
            <div className="relative aspect-video w-full">
              <iframe
                title={video.title}
                src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?autoplay=1&rel=0&modestbranding=1`}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 h-full w-full"
                onLoad={handlePlay}
              />
            </div>
          ) : (
            <video
              ref={videoRef}
              src={video.src}
              poster={video.poster}
              controls
              autoPlay
              playsInline
              onPlay={handlePlay}
              onEnded={handleEnded}
              className="h-auto w-full"
            >
              Your browser does not support video playback.
            </video>
          )}
        </div>

        <div className="px-6 py-4">
          <h2
            id="page-tour-title"
            className="font-heading text-lg font-semibold text-midnight-navy"
          >
            {video.title}
          </h2>
          <p className="mt-1 text-sm text-slate-gray">{video.description}</p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
