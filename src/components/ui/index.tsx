import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

export function PageContainer({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>;
}

export function SectionHeader({ title, description }: { title: string; description?: string }) {
  return <div><h2 className="text-xl font-bold tracking-tight text-stone-950 sm:text-2xl">{title}</h2>{description && <p className="mt-1.5 text-sm leading-6 text-stone-600 sm:text-base">{description}</p>}</div>;
}

export const PrimaryButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(function PrimaryButton({ className = "", ...props }, ref) {
  return <button ref={ref} className={`min-h-12 rounded-xl bg-stone-950 px-5 py-3 font-semibold text-white transition duration-200 hover:bg-emerald-900 active:translate-y-px disabled:cursor-not-allowed disabled:bg-stone-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 ${className}`} {...props} />;
});

export function StatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "warning" }) {
  const toneClass = tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : tone === "warning" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-stone-200 bg-stone-100 text-stone-700";
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClass}`}>{children}</span>;
}

export function InlineNotice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "error" | "success" }) {
  const toneClass = tone === "error" ? "border-red-200 bg-red-50 text-red-900" : tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-950" : "border-stone-200 bg-stone-50 text-stone-700";
  return <div role={tone === "error" ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm leading-6 ${toneClass}`}>{children}</div>;
}

export function LoadingSkeleton({ label = "내용을 불러오고 있어요." }: { label?: string }) {
  return <div role="status" aria-label={label} className="space-y-3 animate-pulse motion-reduce:animate-none"><div className="h-5 w-2/5 rounded bg-stone-200"/><div className="h-20 rounded-xl bg-stone-100"/><span className="sr-only">{label}</span></div>;
}
