import type { MetadataRoute } from "next";
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://hanip.vercel.app";
export default function sitemap(): MetadataRoute.Sitemap { return ["", "/terms", "/privacy", "/privacy/summary"].map((path) => ({ url: `${baseUrl}${path}`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: path ? 0.7 : 1 })); }
