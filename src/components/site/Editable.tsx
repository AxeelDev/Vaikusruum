"use client";

import {
  type CSSProperties,
  type ElementType,
  type MouseEvent,
  type ReactNode,
} from "react";
import { useOptionalEditor, type EditPath } from "@/components/editor/EditorProvider";
import { appearanceToStyle } from "@/lib/editor/appearance";
import { renderText } from "@/lib/content/markdown";
import { splitWordmark } from "@/lib/content/wordmark";
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
    "data-vr-selection-style-key": selection.styleKey,
    "data-vr-selected": selected ? "" : undefined,
    "data-editor-node-id": selection.id,
    "data-editor-node-type": selection.type,
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
  clickMode = "select",
}: {
  selection: EditorSelection;
  path: EditPath;
  as?: ElementType;
  className?: string;
  value: string;
  appearance?: TextAppearance;
  style?: CSSProperties;
  clickMode?: "select" | "defer";
}) {
  const editor = useOptionalEditor();
  void _path;
  const selected = editor?.state.selected?.id === selection.id && !editor.state.preview;
  const wordmark = String(className ?? "").includes("vr-wordmark");
  const lines = wordmark ? splitWordmark(value) : null;
  // The wordmark is drawn letter-spaced on its own lines, so Markdown marks are left as typed there.
  const rendered = wordmark ? value : renderText(value);
  const classNames = [className, lines ? "vr-wordmark--split" : ""].filter(Boolean).join(" ");

  const mergedStyle: CSSProperties = {
    ...appearanceToStyle(appearance),
    ...style,
  };

  const inner = lines
    ? lines.map((line, index) => (
        <span key={index} className="vr-wordmark-line">
          {line}
        </span>
      ))
    : rendered;

  if (!editor) {
    return (
      <Tag className={classNames} style={mergedStyle}>
        {inner}
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
      className={classNames}
      style={mergedStyle}
      {...editProps(selection, Boolean(selected), editor.state.preview)}
      onClick={onClick}
    >
      {inner}
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
