import { notFound } from "next/navigation";
export default async function ConversationQaPage() {
  if (process.env.NODE_ENV === "production") notFound();
  const ConversationQaClient = (await import("./ConversationQaClient")).default;
  return <ConversationQaClient />;
}
