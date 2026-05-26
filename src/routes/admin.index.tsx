import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { Users, Package, DollarSign, Flag, Wallet, Bitcoin, TrendingUp, AlertCircle, Activity, ShieldAlert, Wrench, ServerCrash } from "lucide-react";

import { SeedDemoButton } from "@/components/admin/SeedDemoButton";
import { panelCls, AdminPageHeader } from "@/components/admin/ui";
import { KpiTile } from "@/components/admin/KpiTile";
import { ErrorFallback, CardGridSkeleton } from "@/components/admin/Skeletons";
import {
  getQuickStats, getRecentActivity, getDashboardSparklines, getFunnelStats, getDashboardOverview, getSystemHealth,
} from "@/lib/admin.functions";


export const Route = createFileRoute("/admin/")({
  component: DashboardPage,
});

type RangeDays = 7 | 30 | 90;
const RANGE_KEY = "admin.dashboard.range";




const COLORS = ["#7c5cff", "#22c1c3", "#ff7a59", "#36c172", "#ffb454", "#e94aa8", "#5aa9ff"];

function DashboardPage() {
  const quickStatsFn = useServerFn(getQuickStats);
  const activityFn = useServerFn(getRecentActivity);
  const sparklinesFn = useServerFn(getDashboardSparklines);
  const funnelFn = useServerFn(getFunnelStats);
  const overviewFn = useServerFn(getDashboardOverview);
  const healthFn = useServerFn(getSystemHealth);

  const [range, setRange] = useState<RangeDays>(30);
  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(RANGE_KEY) : null;
    if (saved === "7" || saved === "30" || saved === "90") setRange(Number(saved) as RangeDays);
  }, []);
  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem(RANGE_KEY, String(range));
  }, [range]);

  const overview = useQuery({
    queryKey: ["admin-overview", range],
    queryFn: () => overviewFn({ data: { days: range } }),
    staleTime: 60_000,
  });

  const quick = useQuery({ queryKey: ["admin-quick-stats"], queryFn: () => quickStatsFn() });
  const activity = useQuery({ queryKey: ["admin-activity"], queryFn: () => activityFn() });
  const sparks = useQuery({
    queryKey: ["admin-sparklines", range],
    queryFn: () => sparklinesFn({ data: { days: range } }),
    staleTime: 60_000,
  });
  const funnel = useQuery({
    queryKey: ["admin-funnel", range],
    queryFn: () => funnelFn({ data: { days: range } }),
    staleTime: 60_000,
  });
  const health = useQuery({
    queryKey: ["admin-system-health"],
    queryFn: () => healthFn(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const charts = overview.data
    ? {
        days: overview.data.days.map((d) => ({
          ...d,
          date: format(parseISO(d.date), "MMM d"),
        })),
        byCategory: overview.data.byCategory,
        byStatus: overview.data.byStatus,
      }
    : null;

  const totals = overview.data?.totals;
  const totalRevenue = totals?.totalRevenue ?? 0;
  const active = totals?.activeListings ?? 0;
  const newUsers7d = totals?.newUsers7d ?? 0;

  const s = sparks.data;
  const fn = funnel.data;
  const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);


  return (
    <div>
      <AdminPageHeader
        title="Dashboard"
        subtitle="At-a-glance view of the marketplace"
        actions={
          <div className="flex items-center gap-2">
            <RangeToggle value={range} onChange={setRange} />
            <SeedDemoButton />
          </div>
        }
      />

      {/* Hero health strip */}
      <HealthStrip
        loading={health.isLoading}
        error={health.isError ? (health.error as Error)?.message : undefined}
        onRetry={() => health.refetch()}
        data={health.data}
      />

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">

        <KpiTile icon={<Users className="h-4 w-4" />} label={`Users (${range}d)`} value={s?.users.current ?? "—"} delta={s?.users} spark={s?.users.spark} accent="#7c5cff" loading={sparks.isLoading} />
        <KpiTile icon={<Package className="h-4 w-4" />} label={`Listings (${range}d)`} value={s?.listings.current ?? "—"} delta={s?.listings} spark={s?.listings.spark} accent="#22c1c3" loading={sparks.isLoading} />
        <KpiTile icon={<DollarSign className="h-4 w-4" />} label={`Revenue (${range}d)`} value={`$${(s?.revenue.current ?? 0).toFixed(2)}`} delta={s?.revenue} spark={s?.revenue.spark} accent="#ff7a59" loading={sparks.isLoading} />
        <KpiTile icon={<Flag className="h-4 w-4" />} label={`Reports (${range}d)`} value={s?.reports.current ?? "—"} delta={s?.reports} spark={s?.reports.spark} accent="#e94aa8" loading={sparks.isLoading} />
        <KpiTile icon={<Package className="h-4 w-4" />} label="Active listings" value={active} accent="#36c172" />
        <KpiTile icon={<DollarSign className="h-4 w-4" />} label="Revenue (all-time)" value={`$${totalRevenue.toFixed(2)}`} accent="#ffb454" />
        <KpiTile icon={<Wallet className="h-4 w-4" />} label="Total in wallets" value={`$${(quick.data?.totalWalletUsd ?? 0).toFixed(2)}`} accent="#5aa9ff" />
        <KpiTile icon={<Bitcoin className="h-4 w-4" />} label="Pending top-ups" value={quick.data?.pendingTopups ?? "—"} accent="#ffb454" />
        <KpiTile icon={<TrendingUp className="h-4 w-4" />} label="New users (7d)" value={newUsers7d} accent="#7c5cff" />
        <KpiTile icon={<AlertCircle className="h-4 w-4" />} label="Low-balance users" value={quick.data?.lowBalanceUsers.length ?? "—"} accent="#e94aa8" />
        <KpiTile icon={<Users className="h-4 w-4" />} label="Total users" value={totals?.totalUsers ?? "—"} accent="#22c1c3" />
        <KpiTile icon={<Flag className="h-4 w-4" />} label="Open reports" value={totals?.openReports ?? "—"} accent="#ff7a59" />

      </div>

      {/* Funnel */}
      <div className={panelCls + " mt-4 p-4"}>
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-medium text-slate-100">Activation funnel ({range}d)</div>
          <span className="text-[11px] text-slate-500">Signups in cohort → posted a listing → made a paid promotion</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <FunnelStep label="Signups" value={fn?.signups ?? 0} pct={100} accent="#7c5cff" />
          <FunnelStep label="Posted listing" value={fn?.posted ?? 0} pct={pct(fn?.posted ?? 0, fn?.signups ?? 0)} accent="#22c1c3" />
          <FunnelStep label="Paid promotion" value={fn?.paid ?? 0} pct={pct(fn?.paid ?? 0, fn?.signups ?? 0)} accent="#ff7a59" />
        </div>
      </div>

      {/* Quick actions */}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild size="sm" variant="outline" className="rounded-full border-white/20 bg-white/5 text-slate-100 hover:bg-white/10"><Link to="/admin/reports">Review reports ({quick.data?.openReports ?? 0})</Link></Button>
        <Button asChild size="sm" variant="outline" className="rounded-full border-white/20 bg-white/5 text-slate-100 hover:bg-white/10"><Link to="/admin/topups">Pending top-ups ({quick.data?.pendingTopups ?? 0})</Link></Button>
        <Button asChild size="sm" variant="outline" className="rounded-full border-white/20 bg-white/5 text-slate-100 hover:bg-white/10"><Link to="/admin/wallets">Manage wallets</Link></Button>
        <Button asChild size="sm" variant="outline" className="rounded-full border-white/20 bg-white/5 text-slate-100 hover:bg-white/10"><Link to="/admin/activity">Open activity →</Link></Button>
      </div>



      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Signups & listings (30 days)">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={charts?.days ?? []}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} interval={4} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)" }} />
              <Legend />
              <Line type="monotone" dataKey="users" stroke="#7c5cff" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="listings" stroke="#22c1c3" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Revenue per day (30 days)">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={charts?.days ?? []}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} interval={4} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)" }} />
              <Bar dataKey="revenue" fill="#ff7a59" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Listings by category">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={charts?.byCategory ?? []}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)" }} />
              <Bar dataKey="value" fill="#36c172" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Listing status">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={charts?.byStatus ?? []} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} label>
                {(charts?.byStatus ?? []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)" }} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-slate-100">Recent activity</h2>
          <Link to="/admin/activity" className="text-xs text-indigo-300 hover:underline">Open full feed →</Link>
        </div>
        <div className={panelCls + " divide-y divide-white/5"}>
          {(activity.data?.items ?? []).slice(0, 20).map((item, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <Badge variant="secondary" className="capitalize">{item.kind}</Badge>
              <span className="flex-1 truncate text-slate-300">
                {item.kind === "signup" && <>New signup: <span className="text-slate-100">{String(item.payload.display_name)}</span></>}
                {item.kind === "listing" && <>Listing posted: <span className="text-slate-100">{String(item.payload.title)}</span></>}
                {item.kind === "payment" && <>Payment ${Number(item.payload.amount).toFixed(2)} ({String(item.payload.type)}) — {String(item.payload.status)}</>}
                {item.kind === "topup" && <>Top-up ${Number(item.payload.amount).toFixed(2)} — {String(item.payload.status)}</>}
                {item.kind === "report" && <>Report ({String(item.payload.reason)}) — {String(item.payload.status)}</>}
              </span>
              <span className="shrink-0 text-xs text-slate-500">{formatDistanceToNow(new Date(item.at), { addSuffix: true })}</span>
            </div>
          ))}
          {!activity.data?.items.length && <div className="px-4 py-8 text-center text-sm text-slate-400">No recent activity.</div>}
        </div>
      </div>
    </div>
  );
}

function RangeToggle({ value, onChange }: { value: RangeDays; onChange: (v: RangeDays) => void }) {
  const opts: RangeDays[] = [7, 30, 90];
  return (
    <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-0.5 text-xs">
      {opts.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={`rounded-full px-3 py-1 transition ${
            value === o ? "bg-indigo-500/30 text-indigo-100" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          {o}d
        </button>
      ))}
    </div>
  );
}

function FunnelStep({ label, value, pct, accent }: { label: string; value: number; pct: number; accent: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] uppercase tracking-wide text-slate-400">{label}</span>
        <span className="text-[11px] font-medium" style={{ color: accent }}>{pct}%</span>
      </div>
      <div className="mt-1 font-display text-xl font-bold text-slate-100">{value}</div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, background: accent }} />
      </div>
    </div>
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
