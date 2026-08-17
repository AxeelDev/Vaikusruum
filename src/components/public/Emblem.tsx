export function Emblem({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? "vr-emblem"}
      viewBox="0 0 400 400"
      role="img"
      aria-hidden="true"
      focusable="false"
    >
      <title>Vaikusruum</title>
      {Array.from({ length: 18 }, (_, ray) => {
        const angle = (ray / 18) * Math.PI * 2;
        return Array.from({ length: 14 }, (__, i) => {
          const t = (i + 3) / 17;
          const r = 28 + t * 148;
          const spiral = angle + t * 0.85;
          const x = 200 + Math.cos(spiral) * r;
          const y = 200 + Math.sin(spiral) * r;
          const radius = 1.1 + t * 2.4;
          const gold = 228 - t * 40;
          const orange = 178 - t * 30;
          return (
            <circle
              key={`${ray}-${i}`}
              cx={x}
              cy={y}
              r={radius}
              fill={`rgb(${210 + t * 20}, ${gold}, ${orange})`}
              opacity={0.55 + t * 0.35}
            />
          );
        });
      })}
    </svg>
  );
}
