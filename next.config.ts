import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Content-Security-Policy", value: `default-src 'self'; script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests` },
      { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
    ];
    const noIndexHeaders = [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }];
    return [
      { source: "/(.*)", headers: securityHeaders },
      ...["/login", "/chat/:path*", "/progress/:path*", "/settings/:path*", "/account/:path*", "/admin/:path*", "/dev/:path*"].map((source) => ({ source, headers: noIndexHeaders })),
    ];
  },
};

export default nextConfig;
