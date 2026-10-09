"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { logoutAction } from "@/lib/actions/admin";
import type { AdminUser } from "@/lib/auth/admin";

type NavItem = { href: string; label: string; exact?: boolean };

const ICON = {
  width: 18,
  height: 18,
  viewBox: "0 0 18 18",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const NAV: NavItem[] = [
  {
    href: "/admin",
    label: "Ülevaade",
    exact: true,
  },
  {
    href: "/admin/editor",
    label: "Muuda veebilehte",
  },
  {
    href: "/admin/submissions",
    label: "Registreerumised",
  },
  {
    href: "/admin/tagasiside",
    label: "Tagasiside",
  },
  {
    href: "/admin/media",
    label: "Pildid",
  },
  {
    href: "/admin/settings",
    label: "Seaded",
  },
];

function isActive(pathname: string, item: NavItem) {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function AdminShell({ admin, children }: { admin: AdminUser; children: ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const current = NAV.find((item) => isActive(pathname, item));

  return (
    <div className="vr-admin-shell" data-menu-open={menuOpen ? "true" : undefined}>
      <header className="vr-admin-topbar">
        <Link href="/admin" className="vr-admin-brand">
          <span className="vr-wordmark vr-wordmark--header">VAIKUSRUUM</span>
        </Link>
        <span className="vr-admin-topbar-title">{current?.label ?? "Haldus"}</span>
        <button
          type="button"
          className="vr-admin-menu-button"
          aria-expanded={menuOpen}
          aria-controls="vr-admin-sidebar"
          aria-label={menuOpen ? "Sulge menüü" : "Ava menüü"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <svg {...ICON}>{menuOpen ? <path d="m4.5 4.5 9 9M13.5 4.5l-9 9" /> : <path d="M3 5h12M3 9h12M3 13h12" />}</svg>
        </button>
      </header>

      <aside id="vr-admin-sidebar" className="vr-admin-sidebar">
        <Link href="/admin" className="vr-admin-brand vr-admin-brand--sidebar">
          <span className="vr-wordmark vr-wordmark--header">VAIKUSRUUM</span>
          <small>Haldus</small>
        </Link>
        <nav className="vr-admin-nav" aria-label="Haldus">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(pathname, item) ? "page" : undefined}
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="vr-admin-sidebar-foot">
          <a href="/" target="_blank" rel="noreferrer" className="vr-admin-nav-plain">
            Vaata lehte ↗
          </a>
          <div className="vr-admin-user">
            <span title={admin.email ?? undefined}>{admin.email}</span>
            <form action={logoutAction}>
              <button type="submit" className="vr-admin-link-button">
                Logi välja
              </button>
            </form>
          </div>
        </div>
      </aside>
      <button type="button" className="vr-admin-scrim" aria-label="Sulge menüü" tabIndex={-1} onClick={() => setMenuOpen(false)} />

      <main className="vr-admin-main">{children}</main>
    </div>
  );
}

export function AdminPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="vr-admin-page-head">
      <div>
        <h1 className="vr-admin-title">{title}</h1>
        {description ? <p className="vr-admin-lede">{description}</p> : null}
      </div>
      {actions ? <div className="vr-admin-page-actions">{actions}</div> : null}
    </header>
  );
}

/** A destructive button that asks for a second, explicit click before acting. */
export function ConfirmButton({
  label,
  confirmLabel,
  question,
  onConfirm,
  disabled,
}: {
  label: string;
  confirmLabel: string;
  question: string;
  onConfirm: () => void | Promise<void>;
  disabled?: boolean;
}) {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!asking) {
    return (
      <button type="button" className="vr-admin-text-action" disabled={disabled} onClick={() => setAsking(true)}>
        {label}
      </button>
    );
  }
  return (
    <span className="vr-admin-confirm" role="group" aria-label={question}>
      <span>{question}</span>
      <button type="button" className="vr-admin-text-action" disabled={busy} onClick={() => setAsking(false)}>
        Tühista
      </button>
      <button
        type="button"
        className="vr-admin-text-action vr-admin-text-action--danger"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await onConfirm();
          } finally {
            setBusy(false);
            setAsking(false);
          }
        }}
      >
        {busy ? "…" : confirmLabel}
      </button>
    </span>
  );
}
