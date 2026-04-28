import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  serverExternalPackages: ["@napi-rs/canvas"],

  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 7, // 7 days
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  outputFileTracingIncludes: {
    "/api/campaigns/render-video": [
      "./public/fonts/**/*",
      "./node_modules/ffmpeg-static/**/*",
      "./node_modules/@napi-rs/canvas/**/*",
    ],
  },

  async redirects() {
    return [
      // IA cleanup: old dashboard → overview
      {
        source: "/dashboard",
        destination: "/overview",
        permanent: false,
      },
      // IA cleanup: firms → competitors
      {
        source: "/firms",
        destination: "/competitors",
        permanent: true,
      },
      // Old Channel Planner path
      {
        source: "/advertising/test-channel-fit",
        destination: "/advertising/channel-planner",
        permanent: true,
      },
      // Old Ad Saturation paths
      {
        source: "/ad-saturation",
        destination: "/advertising/saturation",
        permanent: true,
      },
      {
        source: "/ad-saturation/:tortSlug",
        destination: "/advertising/saturation/:tortSlug",
        permanent: true,
      },
      // Old Search Visibility path
      {
        source: "/search-visibility",
        destination: "/advertising/search-visibility",
        permanent: true,
      },
      // Old Google Trends path
      {
        source: "/google-trends",
        destination: "/advertising/trends",
        permanent: true,
      },
      // Tort slug normalization: underscores → hyphens (hyphens are canonical)
      {
        source: "/advertising/torts/depo_provera",
        destination: "/advertising/torts/depo-provera",
        permanent: true,
      },
      {
        source: "/advertising/torts/hair_relaxer",
        destination: "/advertising/torts/hair-relaxer",
        permanent: true,
      },
      {
        source: "/advertising/torts/talcum_powder",
        destination: "/advertising/torts/talcum-powder",
        permanent: true,
      },
      {
        source: "/advertising/torts/firefighter_foam",
        destination: "/advertising/torts/afff-firefighting-foam",
        permanent: true,
      },
      {
        source: "/advertising/torts/bard_powerport",
        destination: "/advertising/torts/bard-powerport",
        permanent: true,
      },
      {
        source: "/advertising/torts/olympus_scopes",
        destination: "/advertising/torts/olympus-scopes",
        permanent: true,
      },
      {
        source: "/advertising/torts/ai_suicide",
        destination: "/advertising/torts/ai-suicide",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
