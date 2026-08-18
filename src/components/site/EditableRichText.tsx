"use client";

import { appearanceToStyle } from "@/lib/editor/appearance";
import { useOptionalEditor } from "@/components/editor/EditorProvider";
import { RichText } from "@/components/public/RichText";
import type { EditorSelection } from "@/lib/editor/types";
import type { TextAppearance } from "@/types/content";

export function EditableRichText({
  selection,
  value,
  className,
  appearance,
}: {
  selection: EditorSelection;
  value: unknown;
  className?: string;
  appearance?: TextAppearance;
}) {
  const editor = useOptionalEditor();
  const selected = editor?.state.selected?.id === selection.id && !editor.state.preview;
  const style = appearanceToStyle(appearance);

  if (!editor) {
    return <RichText value={value} className={className} style={style} />;
  }

  return (
    <div
      className={className}
      style={style}
      data-vr-edit-id={editor.state.preview ? undefined : selection.id}
      data-vr-editable={editor.state.preview ? undefined : ""}
      data-vr-selected={selected ? "" : undefined}
      data-vr-selection-id={editor.state.preview ? undefined : selection.id}
      data-vr-selection-type={editor.state.preview ? undefined : selection.type}
      data-vr-selection-section-id={editor.state.preview ? undefined : selection.sectionId}
      data-vr-selection-field={editor.state.preview ? undefined : selection.field}
      data-editor-node-id={editor.state.preview ? undefined : selection.id}
      data-editor-node-type={editor.state.preview ? undefined : selection.type}
      onClick={(event) => {
        if (editor.state.preview) return;
        event.preventDefault();
        event.stopPropagation();
        editor.select(selection);
      }}
    >
      <RichText value={value} className={className} />
    </div>
  );
}
