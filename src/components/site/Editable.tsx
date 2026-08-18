"use client";

import {
  type CSSProperties,
  type ElementType,
  type MouseEvent,
  type ReactNode,
} from "react";
import { useOptionalEditor, type EditPath } from "@/components/editor/EditorProvider";
import { appearanceToStyle } from "@/lib/editor/appearance";
import type { EditorSelection } from "@/lib/editor/types";
import type { TextAppearance } from "@/types/content";

function editProps(selection: EditorSelection, selected: boolean, preview: boolean) {
  if (preview) return {};
  return {
    "data-vr-edit-id": selection.id,
    "data-vr-editable": "",
    "data-vr-selection-id": selection.id,
    "data-vr-selection-type": selection.type,
    "data-vr-selection-section-id": selection.sectionId,
    "data-vr-selection-field": selection.field,
    "data-vr-selection-offering-id": selection.offeringId,
    "data-vr-selection-media-id": selection.mediaId,
    "data-vr-selection-nav-slug": selection.navSlug,
    "data-vr-selected": selected ? "" : undefined,
  };
}

function isNavigateType(type: EditorSelection["type"]) {
  return type === "nav" || type === "link";
}

export function EditableText({
  selection,
  path: _path,
  as: Tag = "p",
  className,
  value,
  appearance,
  style,
  multiline = false,
  clickMode = "select",
}: {
  selection: EditorSelection;
  path: EditPath;
  as?: ElementType;
  className?: string;
  value: string;
  appearance?: TextAppearance;
  style?: CSSProperties;
  multiline?: boolean;
  clickMode?: "select" | "defer";
}) {
  const editor = useOptionalEditor();
  void _path;
  const selected = editor?.state.selected?.id === selection.id && !editor.state.preview;

  const mergedStyle: CSSProperties = {
    ...appearanceToStyle(appearance),
    ...style,
    ...(multiline ? { whiteSpace: "pre-wrap" } : null),
  };

  if (!editor) {
    return (
      <Tag className={className} style={mergedStyle}>
        {value}
      </Tag>
    );
  }

  function onClick(event: MouseEvent) {
    if (editor!.state.preview) return;
    if (clickMode === "defer" && !event.shiftKey) return;
    if (isNavigateType(selection.type) && !event.shiftKey) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    editor!.select(selection);
  }

  return (
    <Tag
      className={className}
      style={mergedStyle}
      {...editProps(selection, Boolean(selected), editor.state.preview)}
      onClick={onClick}
    >
      {value}
    </Tag>
  );
}

export function EditableNode({
  selection,
  className,
  style,
  children,
  as: Tag = "div",
}: {
  selection: EditorSelection;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  as?: ElementType;
}) {
  const editor = useOptionalEditor();
  const selected = editor?.state.selected?.id === selection.id && !editor?.state.preview;

  if (!editor) {
    return (
      <Tag className={className} style={style}>
        {children}
      </Tag>
    );
  }

  return (
    <Tag
      className={className}
      style={style}
      {...editProps(selection, Boolean(selected), editor.state.preview)}
      onClick={(event: MouseEvent) => {
        event.stopPropagation();
        if (editor.state.preview) return;
        editor.select(selection);
      }}
    >
      {children}
    </Tag>
  );
}
