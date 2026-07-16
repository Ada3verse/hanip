import { notFound } from "next/navigation";

export default async function PromptTestPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  const PromptTestClient = (await import("./PromptTestClient")).default;

  return (
    <PromptTestClient
      liveTestsEnabled={process.env.HANIP_ENABLE_LIVE_AI_TESTS === "true"}
    />
  );
}
