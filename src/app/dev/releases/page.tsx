import { notFound } from "next/navigation";
export default async function ReleasesPage() { if (process.env.NODE_ENV === "production") notFound(); const ReleasesClient = (await import("./ReleasesClient")).default; return <ReleasesClient />; }
