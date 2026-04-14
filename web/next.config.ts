import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },

  async redirects() {
    return [
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
    ];
  },
};

export default nextConfig;
