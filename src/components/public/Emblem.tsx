export function Emblem({ className }: { className?: string }) {
  const dots = Array.from({ length: 22 }, (_, ray) => {
    const angle = (ray / 22) * Math.PI * 2;
    return Array.from({ length: 16 }, (__, i) => {
      const t = (i + 2) / 17;
      const r = 22 + t * 168;
      const spiral = angle + t * 0.92;
      const x = Number((200 + Math.cos(spiral) * r).toFixed(3));
      const y = Number((208 + Math.sin(spiral) * r).toFixed(3));
      const radius = Number((1.15 + t * 2.55).toFixed(3));
      const gold = 228 - t * 36;
      const orange = 176 - t * 28;
      return (
        <circle
          key={`${ray}-${i}`}
          cx={x}
          cy={y}
          r={radius}
          fill={`rgb(${Math.round(214 + t * 18)}, ${Math.round(gold)}, ${Math.round(orange)})`}
          opacity={Number((0.58 + t * 0.36).toFixed(3))}
        />
      );
    });
  });

  return (
    <svg
      className={className ?? "vr-emblem"}
      viewBox="0 0 400 400"
      width="100%"
      height="100%"
      role="img"
      aria-hidden="true"
      focusable="false"
    >
      <title>Vaikusruum</title>
      <defs>
        <path id="vr-emblem-title-arc" d="M 42 214 A 168 168 0 0 1 358 214" fill="none" />
      </defs>
      {dots}
      <text className="vr-emblem-wordmark" fill="currentColor">
        <textPath href="#vr-emblem-title-arc" startOffset="50%" textAnchor="middle">
          VAIKUSRUUM
        </textPath>
      </text>
    </svg>
  );
}
