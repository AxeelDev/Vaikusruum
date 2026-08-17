"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { useEffect } from "react";
import { useOptionalEditor } from "@/components/editor/EditorProvider";
import { RichText } from "@/components/public/RichText";
import { emptyDoc } from "@/lib/content/rich-text";
import type { EditorSelection } from "@/lib/editor/types";
import type { TiptapNode } from "@/types/content";

export function EditableRichText({
  selection,
  value,
  className,
}: {
  selection: EditorSelection;
  value: unknown;
  className?: string;
}) {
  const editorApi = useOptionalEditor();
  const active = editorApi?.state.inlineEditingId === selection.id;
  const selected = editorApi?.state.selected?.id === selection.id && !editorApi.state.preview;

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, link: false }),
      Link.configure({ openOnClick: false, autolink: true }),
    ],
    content: (value as object) ?? emptyDoc(),
    onUpdate: ({ editor: instance }) => {
      if (!editorApi || !selection.sectionId) return;
      editorApi.setPath(
        { kind: "section-content", sectionId: selection.sectionId, key: "body" },
        instance.getJSON() as TiptapNode,
        false,
      );
    },
  });

  useEffect(() => {
    if (!editor || active) return;
    const current = JSON.stringify(editor.getJSON());
    const next = JSON.stringify(value ?? emptyDoc());
    if (current !== next) editor.commands.setContent(value ?? emptyDoc(), { emitUpdate: false });
  }, [active, editor, value]);

  if (!editorApi) {
    return <RichText value={value} className={className} />;
  }

  if (!active) {
    return (
      <div
        className={className}
        data-vr-edit-id={selection.id}
        data-vr-editable=""
        data-vr-selected={selected ? "" : undefined}
        onClick={(event) => {
          event.stopPropagation();
          editorApi.select(selection);
        }}
        onDoubleClick={(event) => {
          event.stopPropagation();
          editorApi.select(selection);
          editorApi.startInlineEdit(selection.id);
        }}
      >
        <RichText value={value} className={className} />
      </div>
    );
  }

  return (
    <div
      className={`vr-inline-rich ${className ?? ""}`}
      data-vr-edit-id={selection.id}
      data-vr-editable=""
      data-vr-selected=""
      onClick={(event) => event.stopPropagation()}
    >
      {editor ? (
        <div className="vr-inline-rich-toolbar">
          <button type="button" onClick={() => editor.chain().focus().toggleBold().run()}>
            B
          </button>
          <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()}>
            I
          </button>
          <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
            H2
          </button>
          <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
            H3
          </button>
          <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()}>
            •
          </button>
          <button
            type="button"
            onClick={() => {
              const href = window.prompt("Link");
              if (href) editor.chain().focus().setLink({ href }).run();
            }}
          >
            Link
          </button>
          <button type="button" onClick={() => editor.chain().focus().undo().run()}>
            ↶
          </button>
          <button type="button" onClick={() => editor.chain().focus().redo().run()}>
            ↷
          </button>
        </div>
      ) : null}
      <EditorContent editor={editor} />
    </div>
  );
}
