"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { useEffect, type ReactNode } from "react";
import type { TiptapNode } from "@/types/content";
import { emptyDoc } from "@/lib/content/rich-text";
import { EditorTooltip } from "@/components/editor/ui";

const ICON = {
  width: 16,
  height: 16,
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function RichEditor({
  value,
  onChange,
  onCommit,
}: {
  value: unknown;
  onChange: (value: TiptapNode) => void;
  onCommit?: (value: TiptapNode) => void;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, link: false }),
      Link.configure({ openOnClick: false, autolink: true }),
    ],
    content: (value as object) ?? emptyDoc(),
    onUpdate: ({ editor: instance }) => {
      onChange(instance.getJSON() as TiptapNode);
    },
    onBlur: ({ editor: instance }) => {
      onCommit?.(instance.getJSON() as TiptapNode);
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
      <div className="vr-editor-toolbar" role="toolbar" aria-label="Teksti vormindus">
        <ToolbarButton
          label="Rasvane"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <svg {...ICON}>
            <path d="M4.5 3h5.1a2.6 2.6 0 0 1 0 5.2H4.5V3Z" />
            <path d="M4.5 8.2h5.6A2.7 2.7 0 0 1 10 13.5H4.5V8.2Z" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          label="Kaldkiri"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <svg {...ICON}>
            <path d="M6.5 3.5h6M3.5 12.5h6M9.5 3.5 6.5 12.5" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          label="Pealkiri"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <svg {...ICON}>
            <path d="M3.5 3.5v9M12 3.5v9M3.5 8h8.5" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          label="Alapealkiri"
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <svg {...ICON}>
            <path d="M3.5 4.5v8M10.5 4.5v8M3.5 8.5h7" />
            <path d="M12.2 10.2h1.8M13.1 10.2v2.3" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          label="Loend"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <svg {...ICON}>
            <path d="M6.5 4.2h6.2M6.5 8h6.2M6.5 11.8h6.2" />
            <circle cx="3.6" cy="4.2" r="0.7" fill="currentColor" stroke="none" />
            <circle cx="3.6" cy="8" r="0.7" fill="currentColor" stroke="none" />
            <circle cx="3.6" cy="11.8" r="0.7" fill="currentColor" stroke="none" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          label="Link"
          active={editor.isActive("link")}
          onClick={() => {
            const href = window.prompt("Link");
            if (href) editor.chain().focus().setLink({ href }).run();
            else if (editor.isActive("link")) editor.chain().focus().unsetLink().run();
          }}
        >
          <svg {...ICON}>
            <path d="M6.6 9.4 5.2 10.8a2.1 2.1 0 1 1-3-3L3.6 6.4M9.4 6.6 10.8 5.2a2.1 2.1 0 1 1 3 3L12.4 9.6M6.9 9.1l2.2-2.2" />
          </svg>
        </ToolbarButton>
        <ToolbarButton label="Tagasi" onClick={() => editor.chain().focus().undo().run()}>
          <svg {...ICON}>
            <path d="M4.5 7.5h6.2a2.8 2.8 0 0 1 0 5.6H9" />
            <path d="M6.2 5.2 3.5 7.5 6.2 9.8" />
          </svg>
        </ToolbarButton>
        <ToolbarButton label="Edasi" onClick={() => editor.chain().focus().redo().run()}>
          <svg {...ICON}>
            <path d="M11.5 7.5H5.3a2.8 2.8 0 0 0 0 5.6H7" />
            <path d="M9.8 5.2 12.5 7.5 9.8 9.8" />
          </svg>
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

function ToolbarButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <EditorTooltip label={label}>
      <button
        type="button"
        aria-label={label}
        aria-pressed={active ? true : undefined}
        data-active={active ? "true" : undefined}
        onClick={onClick}
      >
        {children}
      </button>
    </EditorTooltip>
  );
}
