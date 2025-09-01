/** @type {import('next').NextConfig} */

// const { withSentryConfig } = require("@sentry/nextjs");

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "index, follow",
          },
        ],
      },
    ];
  },
};

// --- Commented out Sentry integration for now ---
// module.exports = withSentryConfig(nextConfig, {
//   org: "dishis-technologies",
//   project: "javascript-nextjs",
//   silent: !process.env.CI,
//   disableLogger: true,
// });

module.exports = nextConfig;
