import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth/admin";

export default async function EditorLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdminUser();
  if (!admin) redirect("/admin");
  return children;
}
