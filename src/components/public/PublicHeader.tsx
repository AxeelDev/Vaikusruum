"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { NavItem } from "@/types/content";

export function PublicHeader({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="vr-header">
      <Link href="/" className="vr-wordmark vr-wordmark--header" onClick={() => setOpen(false)}>
        VAIKUSRUUM
      </Link>
      <nav className="vr-nav" aria-label="Peamenüü">
        {items.map((item) => (
          <Link
            key={item.slug}
            href={item.href}
            aria-current={pathname === item.href ? "page" : undefined}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <button type="button" className="vr-menu-toggle" onClick={() => setOpen(true)}>
        Menüü
      </button>
      <div className={open ? "vr-menu-overlay is-open" : "vr-menu-overlay"} aria-hidden={!open}>
        <button type="button" className="vr-menu-close" onClick={() => setOpen(false)}>
          Sulge
        </button>
        <nav aria-label="Mobiilimenüü">
          {items.map((item) => (
            <Link key={item.slug} href={item.href} onClick={() => setOpen(false)}>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
