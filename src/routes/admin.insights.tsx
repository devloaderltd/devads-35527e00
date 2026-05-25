import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { TrendingUp, TrendingDown, Users, Package, DollarSign, Eye } from "lucide-react";
import { AdminPageHeader, panelCls } from "@/components/admin/ui";
import { getAdminInsights } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/insights")({
  head: () => ({ meta: [{ title: "Insights — Admin" }, { name: "robots", content: "noindex" }] }),
  component: InsightsPage,
});

const COLORS = ["#7c5cff", "#22c1c3", "#ff7a59", "#36c172", "#ffb454", "#e94aa8"];

function InsightsPage() {
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const fn = useServerFn(getAdminInsights);
  const q = useQuery({
    queryKey: ["admin-insights", days],
    queryFn: () => fn({ data: { days } }),
  });
  const d = q.data;

  const delta = (cur: number, prev: number) => {
    if (prev === 0) return cur === 0 ? 0 : 100;
    return ((cur - prev) / prev) * 100;
  };

  return (
    <div>
      <AdminPageHeader
        title="Insights"
        subtitle={`Compare current ${days} days vs prior ${days} days`}
        actions={
          <div className="flex gap-1">
            {([7, 30, 90] as const).map((n) => (
              <Button
                key={n}
                size="sm"
                variant={days === n ? "default" : "outline"}
                className="rounded-full"
                onClick={() => setDays(n)}
              >
                {n}d
              </Button>
            ))}
          </div>
        }
      />

      {q.isLoading && <div className="py-10 text-center text-sm text-slate-400">Loading…</div>}

      {d && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <KpiCompare icon={<Users className="h-5 w-5" />} label="Signups" cur={d.current.signups} prev={d.prior.signups} pct={delta(d.current.signups, d.prior.signups)} />
            <KpiCompare icon={<Package className="h-5 w-5" />} label="New listings" cur={d.current.listings} prev={d.prior.listings} pct={delta(d.current.listings, d.prior.listings)} />
            <KpiCompare icon={<DollarSign className="h-5 w-5" />} label="GMV (USD)" cur={`$${d.current.gmv.toFixed(2)}`} prev={`$${d.prior.gmv.toFixed(2)}`} pct={delta(d.current.gmv, d.prior.gmv)} />
            <KpiCompare icon={<Eye className="h-5 w-5" />} label="Views" cur={d.funnel[0]?.count ?? 0} prev={null} pct={null} />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard title={`Activity (${days} days)`}>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={d.daily}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c5cff" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#7c5cff" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c1c3" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#22c1c3" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} interval={Math.ceil(days / 8)} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)" }} />
                  <Legend />
                  <Area type="monotone" dataKey="signups" stroke="#7c5cff" fill="url(#g1)" />
                  <Area type="monotone" dataKey="listings" stroke="#22c1c3" fill="url(#g2)" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title={`Revenue (${days} days)`}>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={d.daily}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} interval={Math.ceil(days / 8)} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)" }} formatter={(v: number) => `$${Number(v).toFixed(2)}`} />
                  <Bar dataKey="revenue" fill="#ff7a59" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Engagement funnel">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={d.funnel} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <YAxis type="category" dataKey="stage" tick={{ fontSize: 11, fill: "#cbd5e1" }} width={120} />
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)" }} />
                  <Bar dataKey="count" fill="#7c5cff" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Revenue by promotion type">
              {d.revenueByPromotion.length === 0 ? (
                <div className="grid h-[260px] place-items-center text-sm text-slate-400">No completed payments in this range.</div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={d.revenueByPromotion} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} label={(e: { name: string; value: number }) => `${e.name}: $${e.value.toFixed(0)}`}>
                      {d.revenueByPromotion.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)" }} formatter={(v: number) => `$${Number(v).toFixed(2)}`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
}

function KpiCompare({ icon, label, cur, prev, pct }: {
  icon: React.ReactNode; label: string;
  cur: React.ReactNode; prev: React.ReactNode | null; pct: number | null;
}) {
  const up = (pct ?? 0) >= 0;
  return (
    <Card className={panelCls + " border-0"}>
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-[10px] uppercase tracking-wide sm:text-xs">{label}</span>
          <span className="text-indigo-300">{icon}</span>
        </div>
        <div className="mt-1.5 font-display text-lg font-bold text-slate-100 sm:mt-2 sm:text-2xl">{cur}</div>
        {pct !== null && (
          <div className={`mt-0.5 flex items-center gap-1 text-xs ${up ? "text-emerald-400" : "text-red-400"}`}>
            {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(pct).toFixed(1)}% <span className="text-slate-500">vs prev {prev}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className={panelCls + " border-0"}>
      <CardContent className="p-4">
        <div className="mb-2 text-sm font-medium text-slate-100">{title}</div>
        {children}
      </CardContent>
    </Card>
  );
}
