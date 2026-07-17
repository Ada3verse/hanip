import { notFound } from "next/navigation";
export default async function SourcesPage() { if (process.env.NODE_ENV === "production") notFound(); const SourcesClient = (await import("./SourcesClient")).default; return <SourcesClient />; }
