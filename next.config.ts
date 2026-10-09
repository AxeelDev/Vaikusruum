import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHost = supabaseUrl ? new URL(supabaseUrl).hostname : undefined;

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  experimental: {
    // Pages fetched in the background stay in the browser for a whole visit (30 min) instead of 5;
    // a full page refresh always loads fresh copies.
    staleTimes: { static: 1800 },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // The site is never meant to be shown inside another site's frame (clickjacking).
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: "/pehme-jooga-ja-loogastus", destination: "/pehme-jooga-ja-gong", permanent: true },
      { source: "/head-teada", destination: "/hea-teada", permanent: true },
      // Admin pages folded into the editor and Seaded.
      { source: "/admin/pages", destination: "/admin/editor", permanent: false },
      { source: "/admin/menu", destination: "/admin/editor", permanent: false },
      { source: "/admin/seo", destination: "/admin/editor", permanent: false },
      { source: "/admin/design", destination: "/admin/editor", permanent: false },
      { source: "/admin/forms", destination: "/admin/submissions", permanent: false },
      { source: "/admin/export", destination: "/admin/settings#varukoopia", permanent: false },
      { source: "/admin/admins", destination: "/admin/settings#administraatorid", permanent: false },
    ];
  },
  images: {
    remotePatterns: supabaseHost
      ? [
          {
            protocol: "https",
            hostname: supabaseHost,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
};

export default nextConfig;
