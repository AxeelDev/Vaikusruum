import type { ThemeTokens } from "@/lib/theme/theme";

const POSITIONS = [
  [8, 12, 2],
  [18, 41, 1.5],
  [27, 8, 2.5],
  [36, 63, 1],
  [44, 22, 2],
  [53, 78, 1.5],
  [61, 15, 1],
  [69, 47, 2.5],
  [76, 86, 1.5],
  [84, 29, 2],
  [91, 58, 1],
  [12, 72, 1.5],
  [23, 91, 2],
  [41, 94, 1],
  [58, 6, 2],
  [73, 34, 1.5],
  [88, 81, 2],
  [6, 52, 1],
  [32, 36, 2],
  [47, 54, 1.5],
  [64, 69, 1],
  [81, 11, 2],
  [15, 26, 1],
  [94, 43, 1.5],
  [5, 88, 2],
  [39, 4, 1],
  [55, 33, 2.5],
  [78, 62, 1],
  [97, 19, 1.5],
  [29, 81, 2],
];

export function Specks({
  enabled,
  density,
}: {
  enabled?: boolean;
  density?: ThemeTokens["specksDensity"] | string;
}) {
  if (enabled === false || density === "off") return null;
  const count = density === "low" ? 30 : 16;
  return (
    <div className="vr-specks" aria-hidden="true">
      {POSITIONS.slice(0, count).map(([left, top, size], index) => (
        <span
          key={index}
          className="vr-speck"
          style={{
            left: `${left}%`,
            top: `${top}%`,
            width: size,
            height: size,
            background:
              index % 9 === 0
                ? "color-mix(in srgb, var(--vr-accent-bluegray) 58%, var(--vr-bg-main))"
                : index % 5 === 0
                  ? "color-mix(in srgb, var(--vr-line) 72%, var(--vr-text-muted))"
                  : "var(--vr-speck-color)",
          }}
        />
      ))}
    </div>
  );
}
