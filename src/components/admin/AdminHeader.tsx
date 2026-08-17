"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/lib/actions/admin";
import type { AdminUser } from "@/lib/auth/admin";

const LINKS = [
  { href: "/admin", label: "Haldus", exact: true },
  { href: "/admin/editor", label: "Editor" },
  { href: "/admin/media", label: "Pildid" },
  { href: "/admin/submissions", label: "Registreerumised" },
  { href: "/admin/settings", label: "Seaded" },
  { href: "/admin/admins", label: "Administraatorid", ownerOnly: true },
];

export function AdminHeader({ admin }: { admin: AdminUser }) {
  const pathname = usePathname();
  const links = LINKS.filter((link) => !link.ownerOnly || admin.role === "owner");
  return (
    <header className="vr-admin-header">
      <Link href="/admin" className="vr-admin-brand">
        <span className="vr-wordmark vr-wordmark--header">VAIKUSRUUM</span>
        <small>Haldus</small>
      </Link>
      <nav className="vr-admin-nav" aria-label="Haldus">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={(link.exact ? pathname === link.href : pathname.startsWith(link.href)) ? "page" : undefined}
          >
            {link.label}
          </Link>
        ))}
        <Link href="/" target="_blank">
          Vaata lehte
        </Link>
        <form action={logoutAction}>
          <button type="submit" className="vr-text-link" style={{ background: "none", border: 0, cursor: "pointer" }}>
            Välju
          </button>
        </form>
      </nav>
    </header>
  );
}
