import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest { return { name: "한잎 - AI 국어 문법 학습", short_name: "한잎", description: "중학생을 위한 AI 국어 문법 학습 서비스", start_url: "/", display: "standalone", background_color: "#ffffff", theme_color: "#ffffff", lang: "ko", icons: [{ src: "/hanip-icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }] }; }
