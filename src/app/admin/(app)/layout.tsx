import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { getAdminUser } from "@/lib/auth/admin";
import { getTheme } from "@/lib/content/queries";
import { themeToCssVars } from "@/lib/theme/theme";

export default async function AdminGroupLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdminUser();
  if (!admin) redirect("/admin");
  const theme = await getTheme();
  return (
    <div className="vr-admin" style={themeToCssVars(theme)}>
      <AdminShell admin={admin}>{children}</AdminShell>
    </div>
  );
}
