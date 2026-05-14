/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
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
  // Redirects — 301 mishmesh.ai → blinkworld.xyz, and www → apex
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "mishmesh.ai" }],
        destination: "https://blinkworld.xyz/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.mishmesh.ai" }],
        destination: "https://blinkworld.xyz/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.blinkworld.xyz" }],
        destination: "https://blinkworld.xyz/:path*",
        permanent: true,
      },
    ];
  },
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
