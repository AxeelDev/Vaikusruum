"use client";

import {
  useEffect,
  useRef,
  type CSSProperties,
  type ElementType,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { useOptionalEditor, type EditPath } from "@/components/editor/EditorProvider";
import { appearanceToStyle } from "@/lib/editor/appearance";
import type { EditorSelection } from "@/lib/editor/types";
import type { TextAppearance } from "@/types/content";

const MOVE_THRESHOLD = 5;

function editProps(id: string, selected: boolean, preview: boolean) {
  if (preview) return {};
  return {
    "data-vr-edit-id": id,
    "data-vr-editable": "",
    "data-vr-selected": selected ? "" : undefined,
  };
}

function isNavigateType(type: EditorSelection["type"]) {
  return type === "nav" || type === "link";
}

export function EditableText({
  selection,
  path,
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
  const ref = useRef<HTMLElement | null>(null);
  const seeded = useRef(false);
  const pointer = useRef({ x: 0, y: 0, moved: false });
  const selected = editor?.state.selected?.id === selection.id && !editor.state.preview;
  const editing = editor?.state.inlineEditingId === selection.id;

  useEffect(() => {
    if (!editing) {
      seeded.current = false;
      return;
    }
    if (ref.current && !seeded.current) {
      ref.current.innerText = value;
      seeded.current = true;
      ref.current.focus();
    }
  }, [editing, value]);

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

  function markPointer(event: PointerEvent) {
    pointer.current = { x: event.clientX, y: event.clientY, moved: false };
  }

  function trackPointer(event: PointerEvent) {
    const dx = event.clientX - pointer.current.x;
    const dy = event.clientY - pointer.current.y;
    if (dx * dx + dy * dy > MOVE_THRESHOLD * MOVE_THRESHOLD) pointer.current.moved = true;
  }

  function onClick(event: MouseEvent) {
    if (editor!.state.preview) return;
    if (pointer.current.moved) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (clickMode === "defer" && !event.shiftKey && !editing) return;
    if (isNavigateType(selection.type) && !event.shiftKey && !editing) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    editor!.select(selection);
  }

  function onDoubleClick(event: MouseEvent) {
    if (editor!.state.preview) return;
    event.preventDefault();
    event.stopPropagation();
    editor!.select(selection);
    editor!.startInlineEdit(selection.id);
  }

  function commit() {
    const text = (ref.current?.innerText ?? "").replace(/\u00a0/g, " ").replace(/\n$/, "");
    if (text !== value) editor!.setPath(path, text, true);
    editor!.stopInlineEdit();
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      if (ref.current) ref.current.innerText = value;
      editor!.stopInlineEdit();
    }
    if (event.key === "Enter" && !multiline) {
      event.preventDefault();
      commit();
    }
  }

  return (
    <Tag
      ref={ref}
      className={className}
      style={mergedStyle}
      {...editProps(selection.id, Boolean(selected), editor.state.preview)}
      contentEditable={editing}
      suppressContentEditableWarning
      onPointerDown={markPointer}
      onPointerMove={trackPointer}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onBlur={() => {
        if (editing) commit();
      }}
      onKeyDown={onKeyDown}
    >
      {editing ? null : value}
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
      {...editProps(selection.id, Boolean(selected), editor.state.preview)}
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
