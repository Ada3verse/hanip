import { notFound } from "next/navigation";
export default async function KnowledgePage() {
  if (process.env.NODE_ENV === "production") notFound();
  const KnowledgeClient = (await import("./KnowledgeClient")).default;
  return <KnowledgeClient />;
}
