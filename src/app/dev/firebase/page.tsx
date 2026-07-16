import { notFound } from "next/navigation";
export default async function FirebaseDevPage() {
  if (process.env.NODE_ENV === "production") notFound();
  const FirebaseClient = (await import("./FirebaseClient")).default;
  return <FirebaseClient />;
}
