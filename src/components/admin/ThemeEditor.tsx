"use client";

import { useMemo, useState } from "react";
import { saveThemeAction } from "@/lib/actions/admin";
import { BODY_FONTS, DEFAULT_THEME, DISPLAY_FONTS, parseTheme, themeToCssVars, type ThemeTokens } from "@/lib/theme/theme";
import { Emblem } from "@/components/public/Emblem";
import { Specks } from "@/components/public/Specks";

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="vr-field vr-color">
      {label}
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
      <input value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

export function ThemeEditor({ initial }: { initial: ThemeTokens }) {
  const [theme, setTheme] = useState(parseTheme(initial));
  const [message, setMessage] = useState("");
  const preview = useMemo(() => themeToCssVars(theme), [theme]);

  function set<K extends keyof ThemeTokens>(key: K, value: ThemeTokens[K]) {
    setTheme({ ...theme, [key]: value });
  }

  async function save() {
    const result = await saveThemeAction(theme);
    setMessage(result && "error" in result ? result.error! : "Salvestatud.");
  }

  return (
    <div>
      <h1 className="vr-admin-title">Välimus</h1>
      <h2 className="vr-heading">Värvid</h2>
      <div className="vr-swatch-row">
        <ColorField label="Põhitaust" value={theme.bgMain} onChange={(v) => set("bgMain", v)} />
        <ColorField label="Soe taust" value={theme.bgWarm} onChange={(v) => set("bgWarm", v)} />
        <ColorField label="Pehme taust" value={theme.bgSoft} onChange={(v) => set("bgSoft", v)} />
        <ColorField label="Tekst" value={theme.text} onChange={(v) => set("text", v)} />
        <ColorField label="Vaiksem tekst" value={theme.textMuted} onChange={(v) => set("textMuted", v)} />
        <ColorField label="Oranž" value={theme.accentOrange} onChange={(v) => set("accentOrange", v)} />
        <ColorField label="Kuld" value={theme.accentGold} onChange={(v) => set("accentGold", v)} />
        <ColorField label="Sinakashall" value={theme.accentBluegray} onChange={(v) => set("accentBluegray", v)} />
        <ColorField label="Joone värv" value={theme.line} onChange={(v) => set("line", v)} />
      </div>
      <h2 className="vr-heading">Kirjatüübid</h2>
      <label className="vr-field">
        Pealkirjad
        <select value={theme.displayFont} onChange={(e) => set("displayFont", e.target.value as ThemeTokens["displayFont"])}>
          {DISPLAY_FONTS.map((font) => (
            <option key={font.id} value={font.id}>
              {font.label}
            </option>
          ))}
        </select>
      </label>
      <label className="vr-field">
        Logo
        <select value={theme.wordmarkFont} onChange={(e) => set("wordmarkFont", e.target.value as ThemeTokens["wordmarkFont"])}>
          {DISPLAY_FONTS.map((font) => (
            <option key={font.id} value={font.id}>
              {font.label}
            </option>
          ))}
        </select>
      </label>
      <label className="vr-field">
        Sisutekst
        <select value={theme.bodyFont} onChange={(e) => set("bodyFont", e.target.value as ThemeTokens["bodyFont"])}>
          {BODY_FONTS.map((font) => (
            <option key={font.id} value={font.id}>
              {font.label}
            </option>
          ))}
        </select>
      </label>
      <h2 className="vr-heading">Tekst</h2>
      <label className="vr-field">
        Teksti suurus ({theme.bodySize}px)
        <input type="range" min={14} max={24} value={theme.bodySize} onChange={(e) => set("bodySize", Number(e.target.value))} />
      </label>
      <label className="vr-field">
        Reavahe ({theme.bodyLineHeight})
        <input type="range" min={1.3} max={2.2} step={0.05} value={theme.bodyLineHeight} onChange={(e) => set("bodyLineHeight", Number(e.target.value))} />
      </label>
      <label className="vr-field">
        Logo tähevahe ({theme.wordmarkTracking}em)
        <input type="range" min={0.08} max={0.4} step={0.01} value={theme.wordmarkTracking} onChange={(e) => set("wordmarkTracking", Number(e.target.value))} />
      </label>
      <h2 className="vr-heading">Vahed</h2>
      <label className="vr-field">
        Sektsiooni ruum ({theme.sectionSpace}px)
        <input type="range" min={48} max={200} value={theme.sectionSpace} onChange={(e) => set("sectionSpace", Number(e.target.value))} />
      </label>
      <h2 className="vr-heading">Nupud</h2>
      <ColorField label="Nupu taust" value={theme.buttonBg} onChange={(v) => set("buttonBg", v)} />
      <ColorField label="Nupu tekst" value={theme.buttonText} onChange={(v) => set("buttonText", v)} />
      <label className="vr-field">
        Ümardus ({theme.buttonRadius})
        <input type="range" min={0} max={999} value={theme.buttonRadius} onChange={(e) => set("buttonRadius", Number(e.target.value))} />
      </label>
      <h2 className="vr-heading">Taust</h2>
      <label className="vr-check">
        <input type="checkbox" checked={theme.specksEnabled} onChange={(e) => set("specksEnabled", e.target.checked)} />
        Näita täpikesi
      </label>
      <label className="vr-field">
        Tihedus
        <select value={theme.specksDensity} onChange={(e) => set("specksDensity", e.target.value as ThemeTokens["specksDensity"])}>
          <option value="off">Väljas</option>
          <option value="very-low">Väga hõre</option>
          <option value="low">Hõre</option>
        </select>
      </label>
      <ColorField label="Täpikeste värv" value={theme.specksColor} onChange={(v) => set("specksColor", v)} />
      <div className="vr-admin-actions">
        <button className="vr-cta" type="button" onClick={save}>
          Salvesta
        </button>
        <button type="button" onClick={() => setTheme(DEFAULT_THEME)}>
          Taasta vaikeseaded
        </button>
        {message ? <span>{message}</span> : null}
      </div>
      <div className="vr-preview vr-site" style={preview}>
        <p className="vr-muted">Eelvaade</p>
        <section className="vr-section vr-section--warm" style={{ position: "relative", padding: "3rem 1rem" }}>
          <Specks enabled={theme.specksEnabled} density={theme.specksDensity} />
          <div className="vr-split">
            <div className="vr-hero-copy">
              <p className="vr-wordmark vr-wordmark--hero">VAIKUSRUUM</p>
              <p>Vaikusruum on kutse aeglustuda, hingata ja olla.</p>
              <p>
                <span className="vr-cta">Võta ühendust</span>
              </p>
            </div>
            <Emblem />
          </div>
        </section>
      </div>
    </div>
  );
}
