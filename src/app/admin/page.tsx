import { redirect } from "next/navigation";
import { BootstrapForm, LoginForm } from "@/components/admin/AuthForms";
import { adminExists, getAdminUser } from "@/lib/auth/admin";
import { getTheme } from "@/lib/content/queries";
import { themeToCssVars } from "@/lib/theme/theme";

export default async function AdminEntryPage() {
  const admin = await getAdminUser();
  if (admin) redirect("/admin/sisu");

  const [exists, theme] = await Promise.all([adminExists(), getTheme()]);

  return (
    <div className="vr-login" style={themeToCssVars(theme)}>
      <div className="vr-login-box">
        <p className="vr-wordmark vr-wordmark--header">VAIKUSRUUM</p>
        <h1 className="vr-admin-title">{exists ? "Logi sisse" : "Loo esimene administraator"}</h1>
        {exists ? <LoginForm /> : <BootstrapForm />}
      </div>
    </div>
  );
}
