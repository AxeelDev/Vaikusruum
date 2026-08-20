"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import {
  canonicalizeHex,
  clamp,
  hexToHsv,
  hsvToHex,
  isHexDraftValid,
  parseColorToHex,
  type Hsv,
  type ThemeSwatch,
} from "@/lib/editor/color";
import { placeFloating, type FloatingPlacement } from "@/lib/editor/popover-position";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function EditorButton({
  children,
  onClick,
  disabled,
  type = "button",
  variant = "secondary",
  className,
  ariaLabel,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  variant?: "primary" | "secondary" | "ghost" | "danger";
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <button
      type={type}
      className={cx("vr-ed-btn", `vr-ed-btn--${variant}`, className)}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}

export function EditorIconButton({
  children,
  onClick,
  disabled,
  active,
  ariaLabel,
  title,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  ariaLabel: string;
  title?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={cx("vr-ed-iconbtn", active && "is-active", className)}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      title={title ?? ariaLabel}
    >
      {children}
    </button>
  );
}

export function EditorTooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="vr-ed-tooltip" data-tooltip={label}>
      {children}
    </span>
  );
}

export function EditorGroup({
  label,
  value,
  inherited,
  onReset,
  children,
}: {
  label: string;
  value?: string;
  inherited?: boolean;
  onReset?: () => void;
  children: ReactNode;
}) {
  return (
    <div className="vr-ed-group">
      <div className="vr-ed-group-head">
        <span className="vr-ed-label">{label}</span>
        <span className="vr-ed-value-row">
          {value != null && value !== "" ? <span className="vr-ed-value">{value}{inherited ? "" : onReset ? " •" : ""}</span> : null}
          {inherited ? <span className="vr-ed-inherited">Inherited</span> : null}
          {onReset && !inherited ? (
            <button type="button" className="vr-ed-reset" aria-label="Lähtesta" onClick={onReset}>
              ↺
            </button>
          ) : null}
        </span>
      </div>
      {children}
    </div>
  );
}

export function EditorDivider() {
  return <hr className="vr-ed-divider" />;
}

export function EditorCollapse({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details className="vr-ed-collapse" open={defaultOpen}>
      <summary>{title}</summary>
      <div className="vr-ed-collapse-body">{children}</div>
    </details>
  );
}

export function EditorTextInput({
  value,
  onChange,
  onCommit,
  placeholder,
  invalid,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  onCommit?: (value: string) => void;
  placeholder?: string;
  invalid?: boolean;
  ariaLabel?: string;
}) {
  return (
    <input
      className={cx("vr-ed-input", invalid && "is-invalid")}
      value={value}
      placeholder={placeholder}
      aria-label={ariaLabel}
      aria-invalid={invalid || undefined}
      onChange={(event) => onChange(event.target.value)}
      onBlur={(event) => onCommit?.(event.target.value)}
    />
  );
}

export function EditorTextarea({
  value,
  onChange,
  onCommit,
  rows = 4,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  onCommit?: (value: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <textarea
      className="vr-ed-textarea"
      rows={rows}
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      onBlur={(event) => onCommit?.(event.target.value)}
    />
  );
}

export function MarkdownHelp({
  items,
}: {
  items: ReadonlyArray<{ sample: string; hint: string }>;
}) {
  return (
    <details className="vr-md-help">
      <summary>Markdown</summary>
      <div className="vr-md-help-list">
        {items.map((item) => (
          <div key={item.sample} className="vr-md-help-row">
            <code>{item.sample}</code>
            <span>{item.hint}</span>
          </div>
        ))}
      </div>
    </details>
  );
}

export function EditorSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      className={cx("vr-ed-switch-row", checked && "is-on")}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
    >
      <span>{label}</span>
      <span className="vr-ed-switch" aria-hidden="true" />
    </button>
  );
}

export function EditorCheck({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className="vr-ed-check">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{children}</span>
    </label>
  );
}

export function EditorSegmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="vr-ed-segment" role="group">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={cx(option.value === value && "is-active")}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function EditorPopover({
  open,
  onClose,
  children,
  className,
  anchorRef,
  placement = "bottom-start",
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  anchorRef: RefObject<HTMLElement | null>;
  placement?: FloatingPlacement;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, ready: false });

  useLayoutEffect(() => {
    if (!open) {
      setCoords({ top: 0, left: 0, ready: false });
      return;
    }
    function update() {
      const trigger = anchorRef.current?.getBoundingClientRect();
      const floating = ref.current?.getBoundingClientRect();
      if (!trigger || !floating) return;
      const next = placeFloating({
        trigger,
        floatingWidth: Math.max(floating.width, 1),
        floatingHeight: Math.max(floating.height, 1),
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        placement,
      });
      setCoords((prev) =>
        prev.ready && prev.top === next.top && prev.left === next.left ? prev : { ...next, ready: true },
      );
    }
    update();
    const floatingEl = ref.current;
    const observer = floatingEl ? new ResizeObserver(update) : null;
    if (floatingEl) observer?.observe(floatingEl);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [anchorRef, open, placement]);

  useEffect(() => {
    if (!open) return;
    function onDoc(event: MouseEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (ref.current?.contains(target) || anchorRef.current?.contains(target)) return;
      onClose();
    }
    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [anchorRef, onClose, open]);

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div
      ref={ref}
      className={cx("vr-ed-popover", className)}
      role="dialog"
      style={{
        top: coords.top,
        left: coords.left,
        visibility: coords.ready ? "visible" : "hidden",
      }}
    >
      {children}
    </div>,
    document.body,
  );
}

export type EditorSelectOption = { value: string; label: string; fontFamily?: string };

export function EditorSelect({
  value,
  options,
  onChange,
  previewFont,
}: {
  value: string;
  options: EditorSelectOption[];
  onChange: (value: string) => void;
  previewFont?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const current = options.find((option) => option.value === value) ?? options[0];
  const style: CSSProperties | undefined =
    previewFont && current?.fontFamily ? { fontFamily: current.fontFamily } : undefined;

  return (
    <div className="vr-ed-select-wrap">
      <button
        ref={anchorRef}
        type="button"
        className={cx("vr-ed-select", previewFont && "vr-ed-select--font")}
        style={style}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((next) => !next)}
      >
        {previewFont && current?.fontFamily ? (
          <span className="vr-ed-font-lines">
            <strong style={{ fontFamily: current.fontFamily }}>{current.label.toUpperCase()}</strong>
            <span>{current.label}</span>
          </span>
        ) : (
          <span>{current?.label ?? value}</span>
        )}
        <Chevron />
      </button>
      <EditorPopover open={open} onClose={() => setOpen(false)} anchorRef={anchorRef} className="vr-ed-select-menu">
        <ul role="listbox">
          {options.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                role="option"
                aria-selected={option.value === value}
                className={cx(option.value === value && "is-active")}
                style={option.fontFamily ? { fontFamily: option.fontFamily } : undefined}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      </EditorPopover>
    </div>
  );
}

export function EditorSlider({
  value,
  min,
  max,
  step = 1,
  onChange,
  onCommit,
  unit,
  exact,
  label,
  displayValue,
  inherited,
  onReset,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  onCommit?: () => void;
  unit?: string;
  exact?: boolean;
  label: string;
  displayValue?: string;
  inherited?: boolean;
  onReset?: () => void;
}) {
  void exact;
  const pct = ((clamp(value, min, max) - min) / (max - min || 1)) * 100;
  const decimals = step < 1 ? String(step).split(".")[1]?.length ?? 2 : 0;
  const shown = Number(value.toFixed(decimals));
  const [typed, setTyped] = useState(String(shown));

  useEffect(() => {
    setTyped(String(shown));
  }, [shown]);

  function nudge(direction: -1 | 1, large: boolean) {
    const jump = large ? step * 10 : step;
    onChange(clamp(Number((value + direction * jump).toFixed(4)), min, max));
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    nudge(event.key === "ArrowRight" ? 1 : -1, event.shiftKey);
  }

  function commitExact(raw: string) {
    const next = Number(raw.replace(",", "."));
    if (!Number.isFinite(next)) {
      setTyped(String(shown));
      return;
    }
    const clamped = clamp(Number(next.toFixed(decimals)), min, max);
    setTyped(String(clamped));
    onChange(clamped);
    onCommit?.();
  }

  return (
    <EditorGroup
      label={label}
      inherited={inherited}
      onReset={onReset}
      value={undefined}
    >
      <div className="vr-ed-value-row" style={{ justifyContent: "flex-end", marginBottom: 6 }}>
        <input
          className="vr-ed-value-input"
          type="number"
          min={min}
          max={max}
          step={step}
          value={typed}
          aria-label={`${label} täpne väärtus`}
          onChange={(event) => setTyped(event.target.value)}
          onBlur={(event) => commitExact(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
            }
          }}
        />
        <span className="vr-ed-value">{displayValue ?? unit ?? ""}</span>
      </div>
      <input
        className="vr-ed-slider"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        style={{ "--vr-ed-fill": `${pct}%` } as CSSProperties}
        onChange={(event) => onChange(Number(event.target.value))}
        onPointerUp={onCommit}
        onKeyDown={onKeyDown}
        onKeyUp={onCommit}
      />
    </EditorGroup>
  );
}

export function EditorColor({
  label,
  value,
  fallback,
  inheritedLabel,
  swatches,
  onChange,
}: {
  label: string;
  value?: string | null;
  fallback: string;
  inheritedLabel?: string;
  swatches: ThemeSwatch[];
  onChange: (value: string) => void;
}) {
  const resolved = parseColorToHex(value) ?? parseColorToHex(fallback) ?? "#3D3A35";
  const inherited = !parseColorToHex(value);
  return (
    <EditorColorInner
      key={resolved}
      label={label}
      resolved={resolved}
      inherited={inherited}
      inheritedLabel={inheritedLabel}
      swatches={swatches}
      onChange={onChange}
    />
  );
}

function EditorColorInner({
  label,
  resolved,
  inherited,
  inheritedLabel,
  swatches,
  onChange,
}: {
  label: string;
  resolved: string;
  inherited: boolean;
  inheritedLabel?: string;
  swatches: ThemeSwatch[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [hex, setHex] = useState(resolved);
  const [invalid, setInvalid] = useState(false);
  const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(resolved));
  const anchorRef = useRef<HTMLButtonElement>(null);

  function commit(next: string) {
    const canonical = canonicalizeHex(next);
    if (!canonical) return;
    setHex(canonical);
    setInvalid(false);
    setHsv(hexToHsv(canonical));
    onChange(canonical);
  }

  function onHexChange(next: string) {
    setHex(next);
    if (!isHexDraftValid(next)) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    commit(next);
  }

  return (
    <EditorGroup label={label} value={inherited ? inheritedLabel : hex}>
      <div className="vr-ed-color">
        <button
          ref={anchorRef}
          type="button"
          className="vr-ed-swatch"
          aria-label={`${label} värv`}
          style={{ background: resolved }}
          onClick={() => setOpen((next) => !next)}
        />
        <input
          className={cx("vr-ed-input", "vr-ed-color-hex", invalid && "is-invalid")}
          value={hex}
          spellCheck={false}
          aria-invalid={invalid || undefined}
          onChange={(event) => onHexChange(event.target.value)}
          onBlur={() => {
            if (isHexDraftValid(hex)) commit(hex);
            else {
              setHex(resolved);
              setInvalid(false);
            }
          }}
        />
        <EditorPopover open={open} onClose={() => setOpen(false)} anchorRef={anchorRef} className="vr-ed-color-pop">
          <ColorArea hsv={hsv} onChange={(next) => commit(hsvToHex(next))} />
          <HueSlider hsv={hsv} onChange={(next) => commit(hsvToHex(next))} />
          <div className="vr-ed-swatches">
            {swatches.map((swatch) => (
              <button
                key={swatch.id}
                type="button"
                className="vr-ed-swatch vr-ed-swatch--sm"
                title={swatch.label}
                aria-label={swatch.label}
                style={{ background: swatch.hex }}
                onClick={() => commit(swatch.hex)}
              />
            ))}
          </div>
        </EditorPopover>
      </div>
    </EditorGroup>
  );
}

function ColorArea({ hsv, onChange }: { hsv: Hsv; onChange: (hsv: Hsv) => void }) {
  const ref = useRef<HTMLDivElement>(null);

  function atPointer(event: ReactPointerEvent<HTMLDivElement>) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const s = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const v = clamp(1 - (event.clientY - rect.top) / rect.height, 0, 1);
    onChange({ ...hsv, s, v });
  }

  return (
    <div
      ref={ref}
      className="vr-ed-color-area"
      style={{ backgroundColor: hsvToHex({ h: hsv.h, s: 1, v: 1 }) }}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        atPointer(event);
      }}
      onPointerMove={(event) => {
        if (event.buttons) atPointer(event);
      }}
    >
      <span className="vr-ed-color-dot" style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%` }} />
    </div>
  );
}

function HueSlider({ hsv, onChange }: { hsv: Hsv; onChange: (hsv: Hsv) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  function atPointer(event: ReactPointerEvent<HTMLDivElement>) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    onChange({ ...hsv, h: clamp((event.clientX - rect.left) / rect.width, 0, 1) * 360 });
  }
  return (
    <div
      ref={ref}
      className="vr-ed-hue"
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        atPointer(event);
      }}
      onPointerMove={(event) => {
        if (event.buttons) atPointer(event);
      }}
    >
      <span style={{ left: `${(hsv.h / 360) * 100}%` }} />
    </div>
  );
}

export function Chevron() {
  return (
    <svg className="vr-ed-chevron" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

export function EditorContext({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="vr-ed-context">
      <p className="vr-ed-context-label">{kicker}</p>
      <p className="vr-ed-context-title">{title}</p>
    </div>
  );
}

export function EditorSpinner() {
  return <span className="vr-ed-spinner" aria-hidden="true" />;
}
