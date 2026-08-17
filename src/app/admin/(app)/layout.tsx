import { redirect } from "next/navigation";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { getAdminUser } from "@/lib/auth/admin";
import { getTheme } from "@/lib/content/queries";
import { themeToCssVars } from "@/lib/theme/theme";

export default async function AdminGroupLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdminUser();
  if (!admin) redirect("/admin");
  const theme = await getTheme();

  return (
    <div className="vr-admin" style={themeToCssVars(theme)}>
      <AdminHeader admin={admin} />
      <div className="vr-admin-main">{children}</div>
    </div>
  );
}
