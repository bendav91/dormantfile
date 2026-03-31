import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ---------------------------------------------------------------------------
  // Compiler
  // ---------------------------------------------------------------------------
  // Remove console.log in production builds (keeps warn/error)
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["warn", "error"] } : false,
  },

  // ---------------------------------------------------------------------------
  // Images
  // ---------------------------------------------------------------------------
  images: {
    formats: ["image/avif", "image/webp"],
  },

  // ---------------------------------------------------------------------------
  // Security headers
  // ---------------------------------------------------------------------------
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-DNS-Prefetch-Control", value: "on" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
        },
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
        {
          key: "Content-Security-Policy",
          value:
            "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://www.google-analytics.com https://analytics.google.com https://*.vercel-insights.com https://*.vercel-analytics.com; frame-ancestors 'self';",
        },
      ],
    },
  ],

  // ---------------------------------------------------------------------------
  // Server external packages (Prisma driver adapter, XML libs, bcrypt)
  // ---------------------------------------------------------------------------
  serverExternalPackages: ["@prisma/adapter-pg", "pg", "bcryptjs", "@xmldom/xmldom", "xml-c14n"],

  // ---------------------------------------------------------------------------
  // Logging
  // ---------------------------------------------------------------------------
  logging: {
    fetches: {
      fullUrl: true,
      hmrRefreshes: true,
    },
  },

  // ---------------------------------------------------------------------------
  // Dev indicator position
  // ---------------------------------------------------------------------------
  devIndicators: false,

  // ---------------------------------------------------------------------------
  // Powered-by header (disable)
  // ---------------------------------------------------------------------------
  poweredByHeader: false,

  // ---------------------------------------------------------------------------
  // Experimental
  // ---------------------------------------------------------------------------
  experimental: {
    // Improved tree-shaking for server components
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
