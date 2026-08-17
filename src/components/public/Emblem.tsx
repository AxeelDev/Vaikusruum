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
          const x = Number((200 + Math.cos(spiral) * r).toFixed(3));
          const y = Number((200 + Math.sin(spiral) * r).toFixed(3));
          const radius = Number((1.1 + t * 2.4).toFixed(3));
          const gold = 228 - t * 40;
          const orange = 178 - t * 30;
          return (
            <circle
              key={`${ray}-${i}`}
              cx={x}
              cy={y}
              r={radius}
              fill={`rgb(${Math.round(210 + t * 20)}, ${Math.round(gold)}, ${Math.round(orange)})`}
              opacity={Number((0.55 + t * 0.35).toFixed(3))}
            />
          );
        });
      })}
    </svg>
  );
}
