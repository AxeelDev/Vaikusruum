"use client";

import { useOptionalEditor } from "@/components/editor/EditorProvider";
import { RichText } from "@/components/public/RichText";
import type { EditorSelection } from "@/lib/editor/types";

export function EditableRichText({
  selection,
  value,
  className,
}: {
  selection: EditorSelection;
  value: unknown;
  className?: string;
}) {
  const editor = useOptionalEditor();
  const selected = editor?.state.selected?.id === selection.id && !editor.state.preview;

  if (!editor) {
    return <RichText value={value} className={className} />;
  }

  return (
    <div
      className={className}
      data-vr-edit-id={editor.state.preview ? undefined : selection.id}
      data-vr-editable={editor.state.preview ? undefined : ""}
      data-vr-selected={selected ? "" : undefined}
      data-vr-selection-id={editor.state.preview ? undefined : selection.id}
      data-vr-selection-type={editor.state.preview ? undefined : selection.type}
      data-vr-selection-section-id={editor.state.preview ? undefined : selection.sectionId}
      data-vr-selection-field={editor.state.preview ? undefined : selection.field}
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
