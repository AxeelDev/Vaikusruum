"use client";

import { useMemo, useState } from "react";
import { savePageMetaAction, saveSectionAction } from "@/lib/actions/admin";
import { RichEditor } from "@/components/admin/RichEditor";
import type { MediaRow, PageRow, SectionRow } from "@/types/content";

export function PageEditor({
  page,
  sections,
  media,
}: {
  page: PageRow;
  sections: SectionRow[];
  media: MediaRow[];
}) {
  const [meta, setMeta] = useState({
    title: page.title,
    nav_label: page.nav_label ?? "",
    seo_title: page.seo_title ?? "",
    seo_description: page.seo_description ?? "",
    show_in_nav: page.show_in_nav,
    is_published: page.is_published,
    nav_order: page.nav_order,
  });
  const [rows, setRows] = useState(sections);
  const [message, setMessage] = useState("");

  async function saveMeta() {
    const result = await savePageMetaAction(page.id, meta);
    setMessage(result && "error" in result && result.error ? result.error : "Salvestatud.");
  }

  return (
    <div className="vr-admin-panel">
      <h1 className="vr-admin-title">{page.title}</h1>
      <p>
        <a href={page.slug === "avaleht" ? "/" : `/${page.slug}`} target="_blank" rel="noreferrer">
          Vaata lehte
        </a>
      </p>
      <label className="vr-field">
        Pealkiri
        <input value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} />
      </label>
      <label className="vr-field">
        Menüü nimi
        <input value={meta.nav_label} onChange={(e) => setMeta({ ...meta, nav_label: e.target.value })} />
      </label>
      <label className="vr-field">
        SEO pealkiri
        <input value={meta.seo_title} onChange={(e) => setMeta({ ...meta, seo_title: e.target.value })} />
      </label>
      <label className="vr-field">
        SEO kirjeldus
        <textarea value={meta.seo_description} onChange={(e) => setMeta({ ...meta, seo_description: e.target.value })} />
      </label>
      <label className="vr-check">
        <input type="checkbox" checked={meta.show_in_nav} onChange={(e) => setMeta({ ...meta, show_in_nav: e.target.checked })} />
        Näita menüüs
      </label>
      <label className="vr-check">
        <input type="checkbox" checked={meta.is_published} onChange={(e) => setMeta({ ...meta, is_published: e.target.checked })} />
        Avalik
      </label>
      <div className="vr-admin-actions">
        <button className="vr-cta" type="button" onClick={saveMeta}>
          Salvesta lehe andmed
        </button>
      </div>
      {rows.map((section, index) => (
        <SectionEditor
          key={section.id}
          section={section}
          media={media}
          onChange={(next) => setRows(rows.map((row, i) => (i === index ? next : row)))}
        />
      ))}
      {message ? <p>{message}</p> : null}
    </div>
  );
}

function SectionEditor({
  section,
  media,
  onChange,
}: {
  section: SectionRow;
  media: MediaRow[];
  onChange: (section: SectionRow) => void;
}) {
  const [message, setMessage] = useState("");
  const content = section.content;
  const title = useMemo(() => {
    if (typeof content.heading === "string" && content.heading) return content.heading;
    return section.section_key;
  }, [content.heading, section.section_key]);

  function patchContent(partial: Record<string, unknown>) {
    onChange({ ...section, content: { ...section.content, ...partial } });
  }

  async function save() {
    const result = await saveSectionAction(section.id, section.content, section.style ?? {}, section.enabled);
    setMessage(result && "error" in result ? result.error! : "Salvestatud.");
  }

  return (
    <section>
      <h2 className="vr-heading">{title}</h2>
      <label className="vr-check">
        <input
          type="checkbox"
          checked={section.enabled}
          onChange={(e) => onChange({ ...section, enabled: e.target.checked })}
        />
        Nähtav
      </label>
      {section.section_type === "hero" ? (
        <label className="vr-field">
          Sissejuhatus
          <textarea
            value={String(content.intro ?? "")}
            onChange={(e) => patchContent({ intro: e.target.value })}
            rows={6}
          />
        </label>
      ) : null}
      {section.section_type === "split_media_text" ? (
        <label className="vr-field">
          Tekst
          <textarea
            value={String(content.plain ?? "")}
            onChange={(e) => patchContent({ plain: e.target.value })}
            rows={8}
          />
        </label>
      ) : null}
      {section.section_type === "rich_text" ? (
        <>
          <label className="vr-field">
            Pealkiri
            <input value={String(content.heading ?? "")} onChange={(e) => patchContent({ heading: e.target.value })} />
          </label>
          <RichEditor value={content.body} onChange={(body) => patchContent({ body })} />
        </>
      ) : null}
      {section.section_type === "faq" ? (
        <FaqEditor items={(content.items as { question: string; answer: string }[]) ?? []} onChange={(items) => patchContent({ items })} />
      ) : null}
      {section.section_type === "important_info" ? (
        <ListEditor
          items={(content.items as string[]) ?? []}
          onChange={(items) => patchContent({ items })}
        />
      ) : null}
      {section.section_type === "testimonials" ? (
        <TestimonialEditor
          items={(content.items as { quote: string; name: string }[]) ?? []}
          onChange={(items) => patchContent({ items })}
        />
      ) : null}
      {section.section_type === "offering_practical_info" ? (
        <>
          <label className="vr-field">
            Aeg ja koht
            <textarea value={String(content.scheduleText ?? "")} onChange={(e) => patchContent({ scheduleText: e.target.value })} />
          </label>
          <label className="vr-field">
            Kaasa võtta
            <input value={String(content.bring ?? "")} onChange={(e) => patchContent({ bring: e.target.value })} />
          </label>
          <label className="vr-field">
            Riietus
            <input value={String(content.clothing ?? "")} onChange={(e) => patchContent({ clothing: e.target.value })} />
          </label>
          <label className="vr-field">
            Märkus
            <input value={String(content.notes ?? "")} onChange={(e) => patchContent({ notes: e.target.value })} />
          </label>
        </>
      ) : null}
      {section.section_type === "private_lessons" ? (
        <>
          <label className="vr-field">
            Tekst
            <input value={String(content.label ?? "")} onChange={(e) => patchContent({ label: e.target.value })} />
          </label>
          <label className="vr-field">
            Nupu tekst
            <input value={String(content.actionLabel ?? "")} onChange={(e) => patchContent({ actionLabel: e.target.value })} />
          </label>
        </>
      ) : null}
      {section.section_type === "contact" ? (
        <label className="vr-field">
          Pealkiri
          <input value={String(content.heading ?? "")} onChange={(e) => patchContent({ heading: e.target.value })} />
        </label>
      ) : null}
      <label className="vr-field">
        Pilt
        <select
          value={String(section.style?.mediaId ?? "")}
          onChange={(e) =>
            onChange({
              ...section,
              style: { ...section.style, mediaId: e.target.value || null },
            })
          }
        >
          <option value="">Ilma pildita</option>
          {media.map((item) => (
            <option key={item.id} value={item.id}>
              {item.alt_text || item.storage_path}
            </option>
          ))}
        </select>
      </label>
      <label className="vr-field">
        Paigutus
        <select
          value={section.style?.layout ?? ""}
          onChange={(e) => onChange({ ...section, style: { ...section.style, layout: e.target.value as never } })}
        >
          <option value="">Vaikimisi</option>
          <option value="image-left">Pilt vasakul / tekst paremal</option>
          <option value="image-right">Tekst vasakul / pilt paremal</option>
          <option value="text-only">Ainult tekst</option>
          <option value="image-only">Ainult pilt</option>
          <option value="centered">Keskne kitsas tekst</option>
        </select>
      </label>
      <div className="vr-admin-actions">
        <button className="vr-cta" type="button" onClick={save}>
          Salvesta
        </button>
        {message ? <span>{message}</span> : null}
      </div>
    </section>
  );
}

function ListEditor({ items, onChange }: { items: string[]; onChange: (items: string[]) => void }) {
  return (
    <div className="vr-admin-panel">
      {items.map((item, i) => (
        <label className="vr-field" key={i}>
          Lõik {i + 1}
          <textarea
            value={item}
            onChange={(e) => onChange(items.map((row, idx) => (idx === i ? e.target.value : row)))}
          />
        </label>
      ))}
      <button type="button" onClick={() => onChange([...items, ""])}>
        Lisa lõik
      </button>
    </div>
  );
}

function FaqEditor({
  items,
  onChange,
}: {
  items: { question: string; answer: string }[];
  onChange: (items: { question: string; answer: string }[]) => void;
}) {
  return (
    <div className="vr-admin-panel">
      {items.map((item, i) => (
        <div key={i}>
          <label className="vr-field">
            Küsimus
            <input
              value={item.question}
              onChange={(e) => onChange(items.map((row, idx) => (idx === i ? { ...row, question: e.target.value } : row)))}
            />
          </label>
          <label className="vr-field">
            Vastus
            <textarea
              value={item.answer}
              onChange={(e) => onChange(items.map((row, idx) => (idx === i ? { ...row, answer: e.target.value } : row)))}
            />
          </label>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, { question: "", answer: "" }])}>
        Lisa küsimus
      </button>
    </div>
  );
}

function TestimonialEditor({
  items,
  onChange,
}: {
  items: { quote: string; name: string }[];
  onChange: (items: { quote: string; name: string }[]) => void;
}) {
  return (
    <div className="vr-admin-panel">
      {items.map((item, i) => (
        <div key={i}>
          <label className="vr-field">
            Tsitaat
            <textarea
              value={item.quote}
              onChange={(e) => onChange(items.map((row, idx) => (idx === i ? { ...row, quote: e.target.value } : row)))}
            />
          </label>
          <label className="vr-field">
            Nimi
            <input
              value={item.name}
              onChange={(e) => onChange(items.map((row, idx) => (idx === i ? { ...row, name: e.target.value } : row)))}
            />
          </label>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, { quote: "", name: "" }])}>
        Lisa tagasiside
      </button>
    </div>
  );
}
