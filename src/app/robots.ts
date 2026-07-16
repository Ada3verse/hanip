import type { MetadataRoute } from "next";
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://hanip.vercel.app";
export default function robots(): MetadataRoute.Robots { return { rules: { userAgent: "*", allow: "/", disallow: ["/dev/", "/api/"] }, sitemap: `${baseUrl}/sitemap.xml` }; }
