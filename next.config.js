/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "pbs.twimg.com" },
      { protocol: "https", hostname: "*.supabase.co" },
    ],
    formats: ["image/avif", "image/webp"],
  },
  // Performance
  poweredByHeader: false,
  compress: true,
  reactStrictMode: true,
  // Headers
  async headers() {
    return [
      {
        // Cache public marketplace assets aggressively
        source: "/marketplace/:path*",
        headers: [
          { key: "Cache-Control", value: "public, s-maxage=60, stale-while-revalidate=300" },
        ],
      },
      {
        source: "/api/tokens",
        headers: [
          { key: "Cache-Control", value: "public, s-maxage=15, stale-while-revalidate=60" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
