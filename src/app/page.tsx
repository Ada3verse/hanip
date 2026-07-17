import HomeClient from "./HomeClient";
import { requireStudentPageSession } from "@/lib/security/studentAccess";

export default async function HomePage() {
  await requireStudentPageSession("/");
  return <HomeClient />;
}
