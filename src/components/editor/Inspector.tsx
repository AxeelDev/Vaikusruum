"use client";

import Link from "next/link";
import { useEditor } from "@/components/editor/EditorProvider";
import { logoutAction } from "@/lib/actions/admin";
import { findSection } from "@/lib/editor/draft";
import { fieldStyle } from "@/lib/editor/appearance";
import { ALL_FONTS, DISPLAY_FONTS } from "@/lib/theme/theme";
import { mediaPublicUrl } from "@/lib/utils/urls";
import type { HeightPreset, OfferingRow, SectionStyle, TextAppearance, VerticalAlign } from "@/types/content";
import type { ReactNode } from "react";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="vr-inspector-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  onCommit,
  advanced,
  unit,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  onCommit?: () => void;
  advanced?: boolean;
  unit?: string;
}) {
  return (
    <div className="vr-inspector-slider">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        onPointerUp={onCommit}
      />
      {advanced ? (
        <input
          className="vr-inspector-num"
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
      ) : null}
      {advanced && unit ? <span className="vr-muted">{unit}</span> : null}
    </div>
  );
}

export function Inspector() {
  const editor = useEditor();
  const { state } = editor;

  return (
    <aside className="vr-inspector" aria-label="Redaktor">
      <div className="vr-inspector-top">
        <div className="vr-inspector-tabs">
          <button type="button" className={state.inspectorTab === "content" ? "is-active" : ""} onClick={() => editor.setTab("content")}>
            A
          </button>
          <button type="button" className={state.inspectorTab === "appearance" ? "is-active" : ""} onClick={() => editor.setTab("appearance")} aria-label="Välimus">
            <BrushIcon />
          </button>
          <button type="button" className={state.inspectorTab === "layout" ? "is-active" : ""} onClick={() => editor.setTab("layout")} aria-label="Paigutus">
            <LayoutIcon />
          </button>
        </div>
        <button type="button" className="vr-inspector-close" onClick={() => editor.closeInspector()} aria-label="Sulge">
          ×
        </button>
      </div>
      {state.themePanel ? <ThemePanel /> : <SelectionPanels />}
      <div className="vr-inspector-admin">
        <Link href="/admin/sisu">Haldus</Link>
        <form action={logoutAction}>
          <button type="submit">Välju</button>
        </form>
      </div>
    </aside>
  );
}

function SelectionPanels() {
  const editor = useEditor();
  const tab = editor.state.inspectorTab;
  const selected = editor.state.selected;
  if (!selected) {
    const page = editor.state.draft.pages.find((item) => item.id === editor.state.pageId);
    return (
      <div className="vr-inspector-empty">
        <p className="vr-inspector-kicker">Leht</p>
        <label className="vr-inspector-field">
          <span>Leht</span>
          <select
            value={editor.state.pageId}
            onChange={(event) => {
              if (editor.state.dirty && !window.confirm("Salvestamata muudatused. Vahetan lehte?")) return;
              editor.switchPage(event.target.value);
            }}
          >
            {editor.state.draft.pages.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nav_label || item.title}
              </option>
            ))}
          </select>
        </label>
        <p>{page?.nav_label || page?.title || "Avaleht"}</p>
        <p>Klõpsa lehel mõnel elemendil, et selle sisu või välimust muuta.</p>
      </div>
    );
  }
  if (tab === "appearance") return <AppearancePanel />;
  if (tab === "layout") return selected.type === "image" ? <ImagePanel /> : <SectionPanel />;
  if (selected.type === "image") return <ImagePanel />;
  if (selected.type === "section" || selected.type === "header") return <SectionPanel />;
  return <ContentPanel />;
}

function ContentPanel() {
  const editor = useEditor();
  const selected = editor.state.selected!;
  const value = readText(editor);
  const title =
    selected.type === "nav" ? "MENÜÜ" : selected.type === "link" ? "LINK" : selected.type === "image" ? "PILT" : "TEKST";

  return (
    <div className="vr-inspector-body">
      <p className="vr-inspector-kicker">{title}</p>
      <p className="vr-inspector-label">{labelFor(selected.id)}</p>
      <textarea
        className="vr-inspector-text"
        rows={value.includes("\n") ? 8 : 3}
        value={value}
        onChange={(event) => writeText(editor, event.target.value, false)}
        onBlur={() => writeText(editor, value, true)}
      />
      {selected.type === "nav" ? <NavTarget /> : null}
      <button type="button" className="vr-inspector-done" onClick={() => editor.deselect()}>
        Valmis
      </button>
    </div>
  );
}

function AppearancePanel() {
  const editor = useEditor();
  const selected = editor.state.selected;
  if (!selected?.sectionId || !selected.field) {
    return <ThemePanel />;
  }
  const section = findSection(editor.state.draft, selected.sectionId);
  if (!section) return <ThemePanel />;
  const appearance = fieldStyle(section, selected.field) ?? {};
  const advanced = editor.state.advanced;
  const sectionId = selected.sectionId;
  const field = selected.field;

  function patch(next: Partial<TextAppearance>, record = false) {
    editor.patchFieldStyle(sectionId, field, next, record);
  }

  return (
    <div className="vr-inspector-body">
      <p className="vr-inspector-kicker">Välimus</p>
      <Field label="Tüüp">
        <select
          value={appearance.role ?? "p"}
          onChange={(event) => patch({ role: event.target.value as TextAppearance["role"] }, true)}
        >
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
          <option value="p">Lõik</option>
        </select>
      </Field>
      <Field label="Värv">
        <input type="color" value={appearance.color ?? editor.state.draft.theme.text} onChange={(event) => patch({ color: event.target.value })} />
      </Field>
      <Field label="Kirjatüüp">
        <select value={appearance.fontId ?? "cormorant"} onChange={(event) => patch({ fontId: event.target.value }, true)}>
          {ALL_FONTS.map((font) => (
            <option key={font.id} value={font.id}>
              {font.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Suurus">
        <Slider min={14} max={96} value={appearance.size ?? 18} onChange={(size) => patch({ size })} advanced={advanced} unit="px" />
      </Field>
      <Field label="Paksus">
        <Slider min={300} max={700} step={50} value={appearance.weight ?? 400} onChange={(weight) => patch({ weight })} advanced={advanced} />
      </Field>
      <Field label="Reavahe">
        <Slider min={1.1} max={2.2} step={0.05} value={appearance.lineHeight ?? 1.7} onChange={(lineHeight) => patch({ lineHeight })} advanced={advanced} />
      </Field>
      <Field label="Tähevahe">
        <Slider min={0} max={0.4} step={0.01} value={appearance.letterSpacing ?? 0} onChange={(letterSpacing) => patch({ letterSpacing })} advanced={advanced} unit="em" />
      </Field>
      <Field label="Joondus">
        <div className="vr-inspector-segment">
          {(["left", "center", "right"] as const).map((align) => (
            <button key={align} type="button" className={appearance.align === align ? "is-active" : ""} onClick={() => patch({ align }, true)}>
              {align === "left" ? "Vasak" : align === "center" ? "Kesk" : "Parem"}
            </button>
          ))}
        </div>
      </Field>
      {editor.role === "owner" ? (
        <label className="vr-check">
          <input type="checkbox" checked={editor.state.advanced} onChange={(event) => editor.setAdvanced(event.target.checked)} />
          Täpsed väärtused
        </label>
      ) : null}
    </div>
  );
}

function SectionPanel() {
  const editor = useEditor();
  const selected = editor.state.selected;
  const sectionId = selected?.sectionId;
  const section = sectionId ? findSection(editor.state.draft, sectionId) : undefined;
  if (!section) {
    return (
      <div className="vr-inspector-body">
        <p className="vr-inspector-kicker">PÄIS</p>
        <Field label="Kõrgus">
          <Slider
            min={56}
            max={140}
            value={editor.state.draft.theme.headerHeight}
            onChange={(headerHeight) => editor.patchTheme({ headerHeight })}
            advanced={editor.state.advanced}
            unit="px"
          />
        </Field>
      </div>
    );
  }

  const style = section.style ?? {};
  function patchStyle(next: Partial<SectionStyle>, record = true) {
    editor.patchSection(section!.id, (row) => ({ ...row, style: { ...row.style, ...next } }), record);
  }

  return (
    <div className="vr-inspector-body">
      <p className="vr-inspector-kicker">SEKTSIOON</p>
      <Field label="Paigutus">
        <select
          value={style.layout ?? ""}
          onChange={(event) => patchStyle({ layout: (event.target.value || undefined) as SectionStyle["layout"] })}
        >
          <option value="">Vaikimisi</option>
          <option value="image-left">Pilt vasakul</option>
          <option value="image-right">Pilt paremal</option>
          <option value="centered">Keskel tekst</option>
          <option value="text-only">Ainult tekst</option>
          <option value="image-only">Ainult pilt</option>
        </select>
      </Field>
      <Field label="Taust">
        <select value={style.background ?? "main"} onChange={(event) => patchStyle({ background: event.target.value as SectionStyle["background"] })}>
          <option value="main">cream</option>
          <option value="warm">soe</option>
          <option value="soft">pehme</option>
        </select>
      </Field>
      <Field label="Kõrgus">
        <select value={style.height ?? "screen"} onChange={(event) => patchStyle({ height: event.target.value as HeightPreset })}>
          <option value="screen">Ekraani kõrgune</option>
          <option value="large">Suur</option>
          <option value="auto">Automaatne</option>
        </select>
      </Field>
      <Field label="Vertikaalne joondus">
        <select value={style.verticalAlign ?? "center"} onChange={(event) => patchStyle({ verticalAlign: event.target.value as VerticalAlign })}>
          <option value="start">Üleval</option>
          <option value="center">Keskel</option>
          <option value="end">All</option>
        </select>
      </Field>
      <Field label="Teksti joondus">
        <select value={style.textAlign ?? "center"} onChange={(event) => patchStyle({ textAlign: event.target.value as SectionStyle["textAlign"] })}>
          <option value="left">Vasak</option>
          <option value="center">Kesk</option>
          <option value="right">Parem</option>
        </select>
      </Field>
      <Field label="Sisu laius">
        <Slider
          min={720}
          max={1440}
          value={style.contentWidth ?? editor.state.draft.theme.contentMaxWidth}
          onChange={(contentWidth) => patchStyle({ contentWidth }, false)}
          advanced={editor.state.advanced}
          unit="px"
        />
      </Field>
      <Field label="Veergude vahe">
        <Slider
          min={24}
          max={180}
          value={style.splitGap ?? editor.state.draft.theme.splitGap}
          onChange={(splitGap) => patchStyle({ splitGap }, false)}
          advanced={editor.state.advanced}
          unit="px"
        />
      </Field>
      <Field label="Veergude tasakaal">
        <select value={style.columnBalance ?? "50-50"} onChange={(event) => patchStyle({ columnBalance: event.target.value as SectionStyle["columnBalance"] })}>
          <option value="40-60">40 / 60</option>
          <option value="50-50">50 / 50</option>
          <option value="60-40">60 / 40</option>
        </select>
      </Field>
      <Field label="Ülemine vahe">
        <Slider min={0} max={160} value={style.topSpace ?? 64} onChange={(topSpace) => patchStyle({ topSpace }, false)} advanced={editor.state.advanced} unit="px" />
      </Field>
      <Field label="Alumine vahe">
        <Slider min={0} max={160} value={style.bottomSpace ?? 64} onChange={(bottomSpace) => patchStyle({ bottomSpace }, false)} advanced={editor.state.advanced} unit="px" />
      </Field>
      <label className="vr-check">
        <input type="checkbox" checked={style.specks !== false} onChange={(event) => patchStyle({ specks: event.target.checked })} />
        Taustatäpid
      </label>
      <label className="vr-check">
        <input
          type="checkbox"
          checked={section.enabled}
          onChange={(event) => editor.patchSection(section.id, (row) => ({ ...row, enabled: event.target.checked }))}
        />
        Nähtav
      </label>
      <div className="vr-inspector-row">
        <button type="button" onClick={() => editor.moveSection(section.id, -1)}>
          ↑
        </button>
        <button type="button" onClick={() => editor.moveSection(section.id, 1)}>
          ↓
        </button>
        <button type="button" onClick={() => editor.removeSection(section.id)}>
          Eemalda
        </button>
      </div>
    </div>
  );
}

function ImagePanel() {
  const editor = useEditor();
  const selected = editor.state.selected;
  const section = selected?.sectionId ? findSection(editor.state.draft, selected.sectionId) : undefined;
  const mediaId = selected?.mediaId || section?.style?.mediaId || "";
  const media = mediaId ? editor.state.draft.media[mediaId] : undefined;
  const image = section?.style?.image ?? {};

  return (
    <div className="vr-inspector-body">
      <p className="vr-inspector-kicker">PILT</p>
      <Field label="Vaheta pilti">
        <select
          value={mediaId}
          onChange={(event) => {
            if (!section) return;
            editor.patchSection(section.id, (row) => ({ ...row, style: { ...row.style, mediaId: event.target.value || null } }));
          }}
        >
          <option value="">Ilma pildita</option>
          {Object.values(editor.state.draft.media).map((item) => (
            <option key={item.id} value={item.id}>
              {item.alt_text || item.storage_path}
            </option>
          ))}
        </select>
      </Field>
      {media ? (
        <>
          <p className="vr-inspector-label">Fookus</p>
          <button
            type="button"
            className="vr-focal"
            onClick={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              const x = Math.round(((event.clientX - rect.left) / rect.width) * 100);
              const y = Math.round(((event.clientY - rect.top) / rect.height) * 100);
              editor.patchMedia(media.id, { focal_x: x, focal_y: y }, true);
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mediaPublicUrl(media.storage_path)} alt="" />
            <span className="vr-focal-point" style={{ left: `${media.focal_x}%`, top: `${media.focal_y}%` }} />
          </button>
        </>
      ) : null}
      <Field label="Kärpimine">
        <select
          value={image.crop ?? "landscape"}
          onChange={(event) =>
            section &&
            editor.patchSection(section.id, (row) => ({
              ...row,
              style: { ...row.style, image: { ...row.style?.image, crop: event.target.value as NonNullable<SectionStyle["image"]>["crop"] } },
            }))
          }
        >
          <option value="original">Algne</option>
          <option value="landscape">Rõhtne</option>
          <option value="portrait">Püstine</option>
          <option value="square">Ruut</option>
        </select>
      </Field>
      <Field label="Laius">
        <Slider
          min={40}
          max={100}
          value={image.width ?? 100}
          onChange={(width) =>
            section &&
            editor.patchSection(
              section.id,
              (row) => ({ ...row, style: { ...row.style, image: { ...row.style?.image, width } } }),
              false,
            )
          }
          advanced={editor.state.advanced}
          unit="%"
        />
      </Field>
      <Field label="Raadius">
        <Slider
          min={0}
          max={40}
          value={image.radius ?? 0}
          onChange={(radius) =>
            section &&
            editor.patchSection(
              section.id,
              (row) => ({ ...row, style: { ...row.style, image: { ...row.style?.image, radius } } }),
              false,
            )
          }
          advanced={editor.state.advanced}
          unit="px"
        />
      </Field>
      <Field label="Paigutus">
        <select
          value={image.align ?? "center"}
          onChange={(event) =>
            section &&
            editor.patchSection(section.id, (row) => ({
              ...row,
              style: { ...row.style, image: { ...row.style?.image, align: event.target.value as "left" | "right" | "center" } },
            }))
          }
        >
          <option value="left">Vasakul</option>
          <option value="center">Keskel</option>
          <option value="right">Paremal</option>
        </select>
      </Field>
      {media ? (
        <Field label="Alternatiivtekst">
          <input
            value={media.alt_text ?? ""}
            onChange={(event) => editor.patchMedia(media.id, { alt_text: event.target.value }, false)}
          />
        </Field>
      ) : null}
    </div>
  );
}

function ThemePanel() {
  const editor = useEditor();
  const theme = editor.state.draft.theme;
  return (
    <div className="vr-inspector-body">
      <p className="vr-inspector-kicker">VÄLIMUS</p>
      <Field label="Põhitaust">
        <input type="color" value={theme.bgMain} onChange={(event) => editor.patchTheme({ bgMain: event.target.value })} />
      </Field>
      <Field label="Soe taust">
        <input type="color" value={theme.bgWarm} onChange={(event) => editor.patchTheme({ bgWarm: event.target.value })} />
      </Field>
      <Field label="Tekst">
        <input type="color" value={theme.text} onChange={(event) => editor.patchTheme({ text: event.target.value })} />
      </Field>
      <Field label="Pealkirjad">
        <select value={theme.displayFont} onChange={(event) => editor.patchTheme({ displayFont: event.target.value as typeof theme.displayFont }, true)}>
          {DISPLAY_FONTS.map((font) => (
            <option key={font.id} value={font.id}>
              {font.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Lehe laius">
        <Slider min={960} max={1600} value={theme.contentMaxWidth} onChange={(contentMaxWidth) => editor.patchTheme({ contentMaxWidth })} advanced={editor.state.advanced} unit="px" />
      </Field>
      <Field label="Üldised vahed">
        <Slider min={48} max={160} value={theme.sectionSpace} onChange={(sectionSpace) => editor.patchTheme({ sectionSpace })} advanced={editor.state.advanced} unit="px" />
      </Field>
      <Field label="Nupu taust">
        <input type="color" value={theme.buttonBg} onChange={(event) => editor.patchTheme({ buttonBg: event.target.value })} />
      </Field>
      <label className="vr-check">
        <input type="checkbox" checked={theme.specksEnabled} onChange={(event) => editor.patchTheme({ specksEnabled: event.target.checked }, true)} />
        Taustatäpid
      </label>
    </div>
  );
}

function NavTarget() {
  const editor = useEditor();
  const slug = editor.state.selected?.navSlug;
  const page = editor.state.draft.pages.find((item) => item.slug === slug);
  if (!page) return null;
  return (
    <Field label="Nähtavus">
      <select
        value={page.show_in_nav ? "1" : "0"}
        onChange={(event) => editor.patchPage(page.id, { show_in_nav: event.target.value === "1" }, true)}
      >
        <option value="1">Näita menüüs</option>
        <option value="0">Peida menüüst</option>
      </select>
    </Field>
  );
}

function readText(editor: ReturnType<typeof useEditor>): string {
  const selected = editor.state.selected;
  if (!selected) return "";
  if (selected.id === "header.wordmark" || selected.field === "site_name") return editor.state.draft.settings.site_name;
  if (selected.id === "footer.text") return editor.state.draft.settings.footer_text ?? "";
  if (selected.type === "nav" && selected.navSlug) {
    const page = editor.state.draft.pages.find((item) => item.slug === selected.navSlug);
    return page?.nav_label || page?.title || "";
  }
  if (selected.offeringId && selected.field) {
    const offering = editor.state.draft.offerings[selected.offeringId];
    return String((offering as Record<string, unknown> | undefined)?.[selected.field] ?? "");
  }
  if (selected.sectionId && selected.field) {
    const section = findSection(editor.state.draft, selected.sectionId);
    if (!section) return "";
    if (selected.field.startsWith("q.")) {
      const index = Number(selected.field.slice(2));
      return String((section.content.items as Array<{ question: string }>)[index]?.question ?? "");
    }
    if (selected.field.startsWith("a.")) {
      const index = Number(selected.field.slice(2));
      return String((section.content.items as Array<{ answer: string }>)[index]?.answer ?? "");
    }
    if (selected.field.startsWith("item.")) {
      const index = Number(selected.field.slice(5));
      return String((section.content.items as string[])[index] ?? "");
    }
    if (selected.field.startsWith("quote.")) {
      const index = Number(selected.field.slice(6));
      return String((section.content.items as Array<{ quote: string }>)[index]?.quote ?? "");
    }
    return String(section.content[selected.field] ?? "");
  }
  if (selected.field === "title") {
    const page = editor.state.draft.pages.find((item) => item.id === editor.state.pageId);
    return page?.title ?? "";
  }
  return "";
}

function writeText(editor: ReturnType<typeof useEditor>, value: string, record: boolean) {
  const selected = editor.state.selected;
  if (!selected) return;
  if (selected.id === "header.wordmark" || selected.field === "site_name") {
    editor.setPath({ kind: "settings", key: "site_name" }, value, record);
    return;
  }
  if (selected.id === "footer.text") {
    editor.setPath({ kind: "settings", key: "footer_text" }, value, record);
    return;
  }
  if (selected.type === "nav" && selected.navSlug) {
    const page = editor.state.draft.pages.find((item) => item.slug === selected.navSlug);
    if (page) editor.setPath({ kind: "nav-label", pageId: page.id }, value, record);
    return;
  }
  if (selected.offeringId && selected.field) {
    editor.setPath({ kind: "offering", offeringId: selected.offeringId, key: selected.field as keyof OfferingRow }, value, record);
    return;
  }
  if (selected.sectionId && selected.field?.startsWith("q.")) {
    editor.setPath({ kind: "faq", sectionId: selected.sectionId, index: Number(selected.field.slice(2)), field: "question" }, value, record);
    return;
  }
  if (selected.sectionId && selected.field?.startsWith("a.")) {
    editor.setPath({ kind: "faq", sectionId: selected.sectionId, index: Number(selected.field.slice(2)), field: "answer" }, value, record);
    return;
  }
  if (selected.sectionId && selected.field?.startsWith("item.")) {
    editor.setPath({ kind: "list-item", sectionId: selected.sectionId, index: Number(selected.field.slice(5)) }, value, record);
    return;
  }
  if (selected.sectionId && selected.field?.startsWith("quote.")) {
    editor.setPath({ kind: "testimonial", sectionId: selected.sectionId, index: Number(selected.field.slice(6)), field: "quote" }, value, record);
    return;
  }
  if (selected.field === "title" && !selected.sectionId) {
    editor.setPath({ kind: "page-title", pageId: editor.state.pageId }, value, record);
    return;
  }
  if (selected.sectionId && selected.field) {
    editor.setPath({ kind: "section-content", sectionId: selected.sectionId, key: selected.field }, value, record);
  }
}

function labelFor(id: string) {
  if (id.includes("title")) return "Pealkiri";
  if (id.includes("intro")) return "Sissejuhatus";
  if (id.includes("wordmark")) return "Lehe pealkiri";
  return "Sisu";
}

function BrushIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 20c2-1 3-3 3-5 0-3 3-6 7-6 1 0 3 1 4 2l-8 8c-1 1-4 2-6 1Z" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function LayoutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="5" width="16" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10 5v14" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}
