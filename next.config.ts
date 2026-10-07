import type { NextConfig } from "next";

// Security headers for the public audit site. The verify page gets a
// stricter policy (connect-src 'none') so a bundle can never be uploaded.
const base = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "frame-src 'self'",
  "frame-ancestors 'self'",
  "base-uri 'none'",
  "form-action 'self'",
  "object-src 'none'",
];
const csp = (connect: string) => [...base, `connect-src ${connect}`].join("; ");
const common = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    if (process.env.NODE_ENV !== "production") return [];
    return [
      { source: "/:path*", headers: [...common, { key: "Content-Security-Policy", value: csp("'self'") }] },
      { source: "/verify", headers: [...common, { key: "Content-Security-Policy", value: csp("'none'") }] },
    ];
  },
};

export default nextConfig;
