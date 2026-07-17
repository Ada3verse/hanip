import { notFound } from "next/navigation";
export default async function ImportPage() { if (process.env.NODE_ENV === "production") notFound(); const ImportClient = (await import("./ImportClient")).default; return <ImportClient />; }
