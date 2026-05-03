/**
 * Page Tour Video Registry
 * ------------------------
 * Single source of truth for in-product page-tour videos. Add a new entry here
 * and reference it via the `slug` from any <PageTour> component.
 *
 * Hosting model:
 *   - Today: videos served as static assets from /public/videos
 *   - Future: when the YouTube channel is live, set `youtubeId` on each entry
 *     and remove the corresponding /public/videos/*.mp4 files. The PageTour
 *     component prefers `youtubeId` over `src` automatically.
 *
 * Keep durations as "M:SS" strings — they're displayed in the preview chip.
 */

export type PageTourVideo = {
  /** Stable slug used as the lookup key. Don't rename without searching for usages. */
  slug: string;
  /** Title shown in the modal header and the hover-preview chip. */
  title: string;
  /** "M:SS" duration for the runtime badge. */
  duration: string;
  /** One-sentence description shown beneath the modal title. */
  description: string;
  /** Local poster image (relative to /public). */
  poster: string;
  /**
   * YouTube ID once the channel is live. When set, the player embeds YouTube
   * via lite-youtube and the local `src` is ignored.
   */
  youtubeId?: string;
  /** MP4 source while we're self-hosting. */
  src: string;
};

export type PageTourSlug =
  | "campaign-builder"
  | "mass-tort-overview"
  | "mdl-tracker"
  | "hair-relaxer"
  | "recall-watchlist";

export const PAGE_TOUR_VIDEOS: Record<PageTourSlug, PageTourVideo> = {
  "campaign-builder": {
    slug: "campaign-builder",
    title: "Tour the Campaign Builder",
    duration: "2:36",
    description:
      "How your team builds end-to-end legal ad campaigns with AI assistance — strategic briefs, ad copy, audio, video, qualification, and download.",
    poster: "/videos/posters/campaign-builder.jpg",
    src: "/videos/campaign-builder.mp4",
  },
  "mass-tort-overview": {
    slug: "mass-tort-overview",
    title: "Tour Mass Tort Overview",
    duration: "2:25",
    description:
      "Every active MDL in one consolidated feed — rulings, settlements, verdicts, and bellwether trials your campaigns need to react to.",
    poster: "/videos/posters/mass-tort-overview.jpg",
    src: "/videos/mass-tort-overview.mp4",
  },
  "mdl-tracker": {
    slug: "mdl-tracker",
    title: "Tour MDL Tracker",
    duration: "2:18",
    description:
      "Official JPML data for all 170 active MDLs — KPIs, top movers, docket table, and per-MDL trend mini-charts.",
    poster: "/videos/posters/mdl-tracker.jpg",
    src: "/videos/mdl-tracker.mp4",
  },
  "hair-relaxer": {
    slug: "hair-relaxer",
    title: "Tour the Hair Relaxer Tort Page",
    duration: "2:46",
    description:
      "The full per-tort campaign intelligence dossier — medical evidence, geographic targeting, qualification, settlement projections, and competitive landscape.",
    poster: "/videos/posters/hair-relaxer.jpg",
    src: "/videos/hair-relaxer.mp4",
  },
  "recall-watchlist": {
    slug: "recall-watchlist",
    title: "Tour the Recall Watchlist",
    duration: "2:51",
    description:
      "Pre-MDL early-warning board scoring 873 manufacturers from Cold to Boiling — see the next mass tort coming before headlines.",
    poster: "/videos/posters/recall-watchlist.jpg",
    src: "/videos/recall-watchlist.mp4",
  },
};
