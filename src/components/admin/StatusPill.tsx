type Tone = "success" | "warning" | "danger" | "info" | "muted" | "accent";

const TONE: Record<Tone, { dot: string; chip: string }> = {
  success: { dot: "bg-emerald-400", chip: "bg-emerald-500/10 text-emerald-200 ring-emerald-400/20" },
  warning: { dot: "bg-amber-400", chip: "bg-amber-500/10 text-amber-200 ring-amber-400/20" },
  danger: { dot: "bg-rose-400", chip: "bg-rose-500/10 text-rose-200 ring-rose-400/20" },
  info: { dot: "bg-sky-400", chip: "bg-sky-500/10 text-sky-200 ring-sky-400/20" },
  accent: { dot: "bg-indigo-400", chip: "bg-indigo-500/10 text-indigo-200 ring-indigo-400/20" },
  muted: { dot: "bg-slate-400", chip: "bg-white/5 text-slate-300 ring-white/10" },
};

export function StatusPill({
  tone = "muted",
  children,
  className = "",
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  const t = TONE[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ring-1 ring-inset ${t.chip} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />
      {children}
    </span>
  );
}

export function toneForStatus(s: string | null | undefined): Tone {
  const v = (s ?? "").toLowerCase();
  if (["active", "approved", "completed", "confirmed", "ok", "resolved", "credited"].includes(v))
    return "success";
  if (["pending", "waiting", "confirming", "open", "draft", "review"].includes(v)) return "warning";
  if (["failed", "rejected", "removed", "banned", "expired", "fatal", "error"].includes(v)) return "danger";
  if (["dismissed", "archived", "inactive", "none"].includes(v)) return "muted";
  return "info";
}
