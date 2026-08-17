import Link from "next/link";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { BootstrapForm, LoginForm } from "@/components/admin/AuthForms";
import { adminExists, getAdminUser } from "@/lib/auth/admin";
import { getTheme } from "@/lib/content/queries";
import { themeToCssVars } from "@/lib/theme/theme";

export default async function AdminEntryPage() {
  const admin = await getAdminUser();
  const theme = await getTheme();

  if (admin) {
    const items = [
      {
        href: "/admin/editor",
        title: "Muuda veebilehte",
        description: "Ava visuaalne leheeditor.",
      },
      {
        href: "/admin/media",
        title: "Pildid",
        description: "Halda veebilehel kasutatavaid pilte.",
      },
      {
        href: "/admin/submissions",
        title: "Registreerumised",
        description: "Vaata registreerumis- ja kontaktivorme.",
      },
      {
        href: "/admin/settings",
        title: "Seaded",
        description: "Muuda üldiseid kontakt- ja saidiseadeid.",
      },
      {
        href: "/admin/admins",
        title: "Administraatorid",
        description: "Halda ligipääsu.",
      },
    ];

    return (
      <div className="vr-admin" style={themeToCssVars(theme)}>
        <AdminHeader admin={admin} />
        <main className="vr-admin-main vr-admin-home">
          <h1 className="vr-admin-title">Haldus</h1>
          <div className="vr-admin-launch-list">
            {items.map((item) => (
              <Link key={item.href} href={item.href} className="vr-admin-launch-row">
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.description}</small>
                </span>
                <span aria-hidden="true">→</span>
              </Link>
            ))}
          </div>
        </main>
      </div>
    );
  }

  const exists = await adminExists();

  return (
    <div className="vr-login" style={themeToCssVars(theme)}>
      <div className="vr-login-box">
        <p className="vr-wordmark vr-wordmark--header">VAIKUSRUUM</p>
        <h1 className="vr-admin-title">{exists ? "Logi sisse" : "Loo administraatori konto"}</h1>
        {exists ? <LoginForm /> : <BootstrapForm />}
      </div>
    </div>
  );
}
