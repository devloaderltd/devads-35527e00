type Props = { data: number[]; color?: string; height?: number; className?: string };

export function Sparkline({ data, color = "currentColor", height = 28, className }: Props) {
  if (!data?.length) return <div style={{ height }} />;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = Math.max(1, max - min);
  const w = 100;
  const h = height;
  const pts = data.map((v, i) => {
    const x = (i / Math.max(1, data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const d = `M ${pts.join(" L ")}`;
  const last = pts[pts.length - 1];
  const fillD = `${d} L ${w},${h} L 0,${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={className} style={{ width: "100%", height, color }}>
      <path d={fillD} fill={color} opacity={0.15} />
      <path d={d} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      {last && <circle cx={Number(last.split(",")[0])} cy={Number(last.split(",")[1])} r={1.8} fill={color} />}
    </svg>
  );
}
