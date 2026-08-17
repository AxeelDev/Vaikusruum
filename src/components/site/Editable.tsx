"use client";

import {
  useEffect,
  useRef,
  type CSSProperties,
  type ElementType,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { useOptionalEditor, type EditPath } from "@/components/editor/EditorProvider";
import { appearanceToStyle } from "@/lib/editor/appearance";
import type { EditorSelection } from "@/lib/editor/types";
import type { TextAppearance } from "@/types/content";

function editProps(id: string, selected: boolean, preview: boolean) {
  if (preview) return {};
  return {
    "data-vr-edit-id": id,
    "data-vr-editable": "",
    "data-vr-selected": selected ? "" : undefined,
  };
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
}: {
  selection: EditorSelection;
  path: EditPath;
  as?: ElementType;
  className?: string;
  value: string;
  appearance?: TextAppearance;
  style?: CSSProperties;
  multiline?: boolean;
}) {
  const editor = useOptionalEditor();
  const ref = useRef<HTMLElement | null>(null);
  const seeded = useRef(false);
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

  function onClick(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    editor!.select(selection);
  }

  function onDoubleClick(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    editor!.select(selection);
    editor!.startInlineEdit(selection.id);
  }

  function commit() {
    const text = ref.current?.innerText ?? "";
    editor!.setPath(path, text.replace(/\u00a0/g, " ").replace(/\n$/, ""));
    editor!.stopInlineEdit();
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
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
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onBlur={() => {
        if (editing) commit();
      }}
      onInput={() => {
        if (!editing || !ref.current) return;
        editor.setPath(path, ref.current.innerText.replace(/\u00a0/g, " "), false);
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
        editor.select(selection);
      }}
    >
      {children}
    </Tag>
  );
}
