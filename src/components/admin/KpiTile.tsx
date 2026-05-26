import { Card, CardContent } from "@/components/ui/card";
import { panelCls } from "./ui";
import { Sparkline } from "./Sparkline";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

type Props = {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  delta?: { current: number; prior: number };
  spark?: number[];
  accent?: string; // hex/css color for spark + icon halo
  loading?: boolean;
};

export function KpiTile({ icon, label, value, delta, spark, accent = "#7c5cff", loading }: Props) {
  let deltaPct: number | null = null;
  if (delta && delta.prior > 0) deltaPct = ((delta.current - delta.prior) / delta.prior) * 100;
  else if (delta && delta.current > 0) deltaPct = 100;

  const deltaCls =
    deltaPct === null ? "text-slate-400" :
    deltaPct > 0 ? "text-emerald-400" :
    deltaPct < 0 ? "text-rose-400" : "text-slate-400";

  const DeltaIcon = deltaPct === null ? Minus : deltaPct > 0 ? ArrowUpRight : deltaPct < 0 ? ArrowDownRight : Minus;

  return (
    <Card className={panelCls + " border-0 overflow-hidden"}>
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-[10px] uppercase tracking-wide sm:text-xs">{label}</span>
          <span className="grid h-7 w-7 place-items-center rounded-md" style={{ background: `${accent}22`, color: accent }}>
            {icon}
          </span>
        </div>
        <div className="mt-1.5 font-display text-lg font-bold text-slate-100 sm:mt-2 sm:text-2xl">
          {loading ? <span className="inline-block h-6 w-16 animate-pulse rounded bg-white/10" /> : value}
        </div>
        <div className="mt-1 flex items-center justify-between gap-2">
          {delta ? (
            <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${deltaCls}`}>
              <DeltaIcon className="h-3 w-3" />
              {deltaPct === null ? "—" : `${Math.abs(deltaPct).toFixed(0)}%`}
            </span>
          ) : <span />}
          {spark && spark.length > 1 && (
            <div className="ml-auto w-20 opacity-90" style={{ color: accent }}>
              <Sparkline data={spark} height={22} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
