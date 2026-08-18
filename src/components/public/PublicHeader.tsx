"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type MouseEvent } from "react";
import { EditableText } from "@/components/site/Editable";
import { useOptionalEditor } from "@/components/editor/EditorProvider";
import type { NavItem } from "@/types/content";

const NAV_HINT = "Klõpsa lehe avamiseks · Shift-klõps muutmiseks";

export function PublicHeader({
  items,
  siteName = "Vaikusruum",
  currentHref,
}: {
  items: NavItem[];
  siteName?: string;
  currentHref?: string;
}) {
  const pathname = usePathname();
  const current = currentHref ?? pathname;
  const [open, setOpen] = useState(false);
  const editor = useOptionalEditor();
  const headerRef = useRef<HTMLElement>(null);
  const menuId = useId();

  useEffect(() => {
    setOpen(false);
  }, [pathname, currentHref]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    function onPointer(event: PointerEvent) {
      const target = event.target as Node | null;
      if (target && headerRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  function closeMenu() {
    setOpen(false);
  }

  function onNavClick(event: MouseEvent<HTMLAnchorElement>, slug: string) {
    closeMenu();
    if (!editor) return;
    event.preventDefault();
    if (event.shiftKey && !editor.state.preview) {
      event.stopPropagation();
      editor.select({
        id: `header.nav.${slug}`,
        type: "nav",
        navSlug: slug,
        field: "nav_label",
      });
      return;
    }
    editor.requestSwitchPageBySlug(slug);
  }

  return (
    <header
      ref={headerRef}
      className="vr-header"
      data-vr-edit-id={editor && !editor.state.preview ? "header.bar" : undefined}
      data-vr-editable={editor && !editor.state.preview ? "" : undefined}
      data-vr-selected={editor?.state.selected?.id === "header.bar" ? "" : undefined}
      onClick={(event) => {
        if (!editor || editor.state.preview) return;
        if (event.target !== event.currentTarget) return;
        editor.select({ id: "header.bar", type: "header" });
      }}
    >
      <div className="vr-header-inner">
        <Link
          href="/"
          className="vr-wordmark vr-wordmark--header"
          title={editor && !editor.state.preview ? NAV_HINT : undefined}
          onClick={(event) => {
            closeMenu();
            if (!editor) return;
            event.preventDefault();
            if (event.shiftKey && !editor.state.preview) {
              editor.select({ id: "header.wordmark", type: "text", field: "site_name" });
              return;
            }
            editor.requestSwitchPageBySlug("avaleht");
          }}
        >
          <EditableText
            as="span"
            className="vr-wordmark vr-wordmark--header"
            selection={{ id: "header.wordmark", type: "text", field: "site_name" }}
            path={{ kind: "settings", key: "site_name" }}
            value={siteName}
            clickMode="defer"
          />
        </Link>
        <nav className="vr-nav" aria-label="Peamenüü">
          {items.map((item) => (
            <Link
              key={item.slug}
              href={item.href}
              aria-current={current === item.href ? "page" : undefined}
              title={editor && !editor.state.preview ? NAV_HINT : undefined}
              onClick={(event) => onNavClick(event, item.slug)}
            >
              <EditableText
                as="span"
                selection={{ id: `header.nav.${item.slug}`, type: "nav", navSlug: item.slug, field: "nav_label" }}
                path={{ kind: "nav-label", pageId: editor?.state.draft.pages.find((page) => page.slug === item.slug)?.id ?? "" }}
                value={item.label}
              />
            </Link>
          ))}
        </nav>
        <button
          type="button"
          className="vr-menu-toggle"
          aria-label="Ava menüü"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((next) => !next)}
        >
          <MenuIcon open={open} />
        </button>
      </div>
      <div id={menuId} className={open ? "vr-nav-sheet is-open" : "vr-nav-sheet"}>
        <nav aria-label="Mobiilimenüü">
          {items.map((item) => (
            <Link
              key={item.slug}
              href={item.href}
              aria-current={current === item.href ? "page" : undefined}
              title={editor && !editor.state.preview ? NAV_HINT : undefined}
              onClick={(event) => onNavClick(event, item.slug)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      {open ? (
        <path d="M4.5 4.5l11 11M15.5 4.5l-11 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      ) : (
        <path d="M3.5 5.5h13M3.5 10h13M3.5 14.5h13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      )}
    </svg>
  );
}
