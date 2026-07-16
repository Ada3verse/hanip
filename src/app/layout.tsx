import type { Metadata, Viewport } from "next";
import PwaRegistration from "./PwaRegistration";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://hanip.vercel.app"),
  title: { default: "한잎 | AI 국어 문법 학습", template: "%s | 한잎" },
  description: "국어 문법을 AI와 함께 이해해 보세요.",
  applicationName: "한잎",
  manifest: "/manifest.webmanifest",
  alternates: { canonical: "/" },
  icons: { icon: "/hanip-icon.svg", apple: "/favicon.ico" },
  openGraph: { title: "한잎 | AI 국어 문법 학습", description: "국어 문법을 AI와 함께 이해해 보세요.", type: "website", locale: "ko_KR" },
  robots: { index: true, follow: true },
};
export const viewport: Viewport = { themeColor: "#ffffff", colorScheme: "light" };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col"><a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-black focus:px-4 focus:py-2 focus:text-white">본문으로 건너뛰기</a><div id="main-content" className="contents">{children}</div><PwaRegistration /></body>
    </html>
  );
}
