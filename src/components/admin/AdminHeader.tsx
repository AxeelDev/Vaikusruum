"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/lib/actions/admin";
import type { AdminUser } from "@/lib/auth/admin";

const LINKS = [
  { href: "/admin/sisu", label: "Sisu" },
  { href: "/admin/tunnid", label: "Tunnid" },
  { href: "/admin/pildid", label: "Pildid" },
  { href: "/admin/menuu", label: "Menüü" },
  { href: "/admin/kontakt", label: "Kontakt" },
  { href: "/admin/valimus", label: "Välimus" },
  { href: "/admin/registreerumised", label: "Registreerumised" },
  { href: "/admin/seaded", label: "Seaded" },
];

export function AdminHeader({ admin }: { admin: AdminUser }) {
  const pathname = usePathname();
  const links = admin.role === "owner" ? [...LINKS, { href: "/admin/advanced", label: "Advanced" }] : LINKS;
  return (
    <header className="vr-admin-header">
      <Link href="/admin/sisu" className="vr-admin-brand">
        <span className="vr-wordmark vr-wordmark--header">VAIKUSRUUM</span>
        <small>Haldus</small>
      </Link>
      <nav className="vr-admin-nav" aria-label="Haldus">
        {links.map((link) => (
          <Link key={link.href} href={link.href} aria-current={pathname.startsWith(link.href) ? "page" : undefined}>
            {link.label}
          </Link>
        ))}
        <form action={logoutAction}>
          <button type="submit" className="vr-text-link" style={{ background: "none", border: 0, cursor: "pointer" }}>
            Välju
          </button>
        </form>
      </nav>
    </header>
  );
}
