"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type MouseEvent } from "react";
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
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const open = menuPath === pathname;
  const editor = useOptionalEditor();

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  function onNavClick(event: MouseEvent<HTMLAnchorElement>, slug: string) {
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
    setMenuPath(null);
  }

  return (
    <header
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
      <Link
        href="/"
        className="vr-wordmark vr-wordmark--header"
        title={editor && !editor.state.preview ? NAV_HINT : undefined}
        onClick={(event) => {
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
      <button type="button" className="vr-menu-toggle" onClick={() => setMenuPath(pathname)}>
        Menüü
      </button>
      <div className={open ? "vr-menu-overlay is-open" : "vr-menu-overlay"} aria-hidden={!open}>
        <button type="button" className="vr-menu-close" onClick={() => setMenuPath(null)}>
          Sulge
        </button>
        <nav aria-label="Mobiilimenüü">
          {items.map((item) => (
            <Link
              key={item.slug}
              href={item.href}
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
