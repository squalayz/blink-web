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
  // MetaMask SDK references React Native's async-storage in optional code
  // paths it doesn't take on web, but webpack still tries to resolve it.
  // Stubbing the module to `false` removes the build warning AND skips the
  // resolution work.
  webpack: (config) => {
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      "@react-native-async-storage/async-storage": false,
      // @wagmi/connectors dynamically imports every wallet SDK it supports.
      // We only ship injected + Coinbase Wallet; stub the optional packages
      // we don't install so webpack can resolve the barrel file.
      porto: false,
      "porto/internal": false,
      "@metamask/connect-evm": false,
      "@base-org/account": false,
      "@safe-global/safe-apps-sdk": false,
      "@safe-global/safe-apps-provider": false,
      "@walletconnect/ethereum-provider": false,
      accounts: false,
    };
    return config;
  },
  async headers() {
    const immutable = [
      { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
    ];
    return [
      {
        // CDN-cache the marketing landing at the edge for 60s with 10-min SWR.
        source: "/",
        headers: [
          { key: "Cache-Control", value: "public, s-maxage=60, stale-while-revalidate=600" },
        ],
      },
      {
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
      // ─── Content-addressed static assets: 1-year immutable cache ───
      { source: "/blink-orb-:size.webp", headers: immutable },
      { source: "/blink-orb.:ext(png|jpg|webp)", headers: immutable },
      { source: "/blink-orb-master.jpg", headers: immutable },
      { source: "/blink-logo.:ext(png|webp|svg)", headers: immutable },
      { source: "/cards/:path*", headers: immutable },
      { source: "/floating-all/:path*", headers: immutable },
      { source: "/floating/:path*", headers: immutable },
      { source: "/textures/:path*", headers: immutable },
      { source: "/creatures/:path*", headers: immutable },
    ];
  },
};

module.exports = nextConfig;
