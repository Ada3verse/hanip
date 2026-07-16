import { notFound } from "next/navigation";
export default async function ReadinessPage() { if (process.env.NODE_ENV === "production") notFound(); const ReadinessClient = (await import("./ReadinessClient")).default; return <ReadinessClient />; }
