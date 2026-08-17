"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { useEffect } from "react";
import type { TiptapNode } from "@/types/content";
import { emptyDoc } from "@/lib/content/rich-text";

export function RichEditor({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (value: TiptapNode) => void;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Link.configure({ openOnClick: false, autolink: true }),
    ],
    content: (value as object) ?? emptyDoc(),
    onUpdate: ({ editor: instance }) => {
      onChange(instance.getJSON() as TiptapNode);
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = JSON.stringify(editor.getJSON());
    const next = JSON.stringify(value ?? emptyDoc());
    if (current !== next) editor.commands.setContent(value ?? emptyDoc(), { emitUpdate: false });
  }, [editor, value]);

  if (!editor) return <div className="vr-editor" />;

  return (
    <div className="vr-editor">
      <div className="vr-editor-toolbar">
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()}>
          Rasvane
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()}>
          Kaldkiri
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          Pealkiri
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          Alapealkiri
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()}>
          Loend
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
          Tagasi
        </button>
        <button type="button" onClick={() => editor.chain().focus().redo().run()}>
          Edasi
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
