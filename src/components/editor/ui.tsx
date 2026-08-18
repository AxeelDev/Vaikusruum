"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import {
  canonicalizeHex,
  clamp,
  formatSliderValue,
  hexToHsv,
  hsvToHex,
  isHexDraftValid,
  parseColorToHex,
  type Hsv,
  type ThemeSwatch,
} from "@/lib/editor/color";

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
  children,
}: {
  label: string;
  value?: string;
  children: ReactNode;
}) {
  return (
    <div className="vr-ed-group">
      <div className="vr-ed-group-head">
        <span className="vr-ed-label">{label}</span>
        {value != null && value !== "" ? <span className="vr-ed-value">{value}</span> : null}
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
}: {
  value: string;
  onChange: (value: string) => void;
  onCommit?: (value: string) => void;
  rows?: number;
}) {
  return (
    <textarea
      className="vr-ed-textarea"
      rows={rows}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onBlur={(event) => onCommit?.(event.target.value)}
    />
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
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) onClose();
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
  }, [onClose, open]);

  if (!open) return null;
  return (
    <div ref={ref} className={cx("vr-ed-popover", className)} role="dialog">
      {children}
    </div>
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
  const current = options.find((option) => option.value === value) ?? options[0];
  const style: CSSProperties | undefined =
    previewFont && current?.fontFamily ? { fontFamily: current.fontFamily } : undefined;

  return (
    <div className="vr-ed-select-wrap">
      <button
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
      <EditorPopover open={open} onClose={() => setOpen(false)} className="vr-ed-select-menu">
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
}) {
  const pct = ((clamp(value, min, max) - min) / (max - min || 1)) * 100;

  function nudge(direction: -1 | 1, large: boolean) {
    const jump = large ? step * 10 : step;
    onChange(clamp(Number((value + direction * jump).toFixed(4)), min, max));
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    nudge(event.key === "ArrowRight" ? 1 : -1, event.shiftKey);
  }

  return (
    <EditorGroup label={label} value={displayValue ?? formatSliderValue(value, unit, exact)}>
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
        <EditorPopover open={open} onClose={() => setOpen(false)} className="vr-ed-color-pop">
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
