import type { MetadataRoute } from "next";
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://hanip.vercel.app";
export default function robots(): MetadataRoute.Robots { return { rules: { userAgent: "*", allow: ["/", "/terms", "/privacy", "/privacy/summary"], disallow: ["/login", "/chat", "/progress", "/settings", "/account", "/admin", "/dev", "/api"] }, sitemap: `${baseUrl}/sitemap.xml` }; }
