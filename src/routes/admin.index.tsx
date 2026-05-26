import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect, useId } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import {
  ResponsiveContainer, ComposedChart, Area, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { Users, Package, DollarSign, Flag, Wallet, Bitcoin, TrendingUp, AlertCircle, Activity, ShieldAlert, Wrench, ServerCrash, RefreshCw, Sparkles } from "lucide-react";

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


  const qc = useQueryClient();
  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ["admin-overview"] });
    qc.invalidateQueries({ queryKey: ["admin-quick-stats"] });
    qc.invalidateQueries({ queryKey: ["admin-activity"] });
    qc.invalidateQueries({ queryKey: ["admin-sparklines"] });
    qc.invalidateQueries({ queryKey: ["admin-funnel"] });
    qc.invalidateQueries({ queryKey: ["admin-system-health"] });
    qc.invalidateQueries({ queryKey: ["admin-badges"] });
  };
  const isFetchingAny =
    overview.isFetching || quick.isFetching || activity.isFetching ||
    sparks.isFetching || funnel.isFetching || health.isFetching;
  const lastUpdated = overview.dataUpdatedAt || health.dataUpdatedAt;

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

      <HeroStrip
        lastUpdated={lastUpdated}
        onRefresh={refreshAll}
        loading={isFetchingAny}
      />

      {/* Hero health strip */}
      <HealthStrip
        loading={health.isLoading}
        error={health.isError ? (health.error as Error)?.message : undefined}
        onRetry={() => health.refetch()}
        onRefresh={() => health.refetch()}
        isFetching={health.isFetching}
        data={health.data}
      />


      <SectionDivider label={`This period · ${range} days`} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">

        <KpiTile icon={<Users className="h-4 w-4" />} label={`Users (${range}d)`} value={s?.users.current ?? "—"} delta={s?.users} spark={s?.users.spark} accent="#7c5cff" loading={sparks.isLoading} />
        <KpiTile icon={<Package className="h-4 w-4" />} label={`Listings (${range}d)`} value={s?.listings.current ?? "—"} delta={s?.listings} spark={s?.listings.spark} accent="#22c1c3" loading={sparks.isLoading} />
        <KpiTile icon={<DollarSign className="h-4 w-4" />} label={`Revenue (${range}d)`} value={`$${(s?.revenue.current ?? 0).toFixed(2)}`} delta={s?.revenue} spark={s?.revenue.spark} accent="#ff7a59" loading={sparks.isLoading} />
        <KpiTile icon={<Flag className="h-4 w-4" />} label={`Reports (${range}d)`} value={s?.reports.current ?? "—"} delta={s?.reports} spark={s?.reports.spark} accent="#e94aa8" loading={sparks.isLoading} />
      </div>

      <SectionDivider label="All-time" />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
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



      <ChartsGrid charts={charts} />


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

type HealthData = {
  counts: {
    users: number;
    listings: number;
    activeListings: number;
    pendingTopups: number;
    failedPayments24h: number;
    openReports: number;
    unresolvedErrors: number;
    serverErrors24h: number;
  };
  walletsTotalUsd: number;
  maintenanceMode: boolean;
};

function HealthStrip({
  loading,
  error,
  onRetry,
  onRefresh,
  isFetching,
  data,
}: {
  loading: boolean;
  error?: string;
  onRetry: () => void;
  onRefresh?: () => void;
  isFetching?: boolean;
  data?: HealthData;
}) {
  if (loading) return <div className="mb-1"><CardGridSkeleton tiles={4} /></div>;
  if (error)
    return (
      <div className="mb-1">
        <ErrorFallback
          title="Couldn't load system health"
          message={error}
          onRetry={onRetry}
          isRetrying={isFetching}
        />
      </div>
    );
  if (!data) return null;
  const c = data.counts;
  const errorsTotal = c.serverErrors24h + c.unresolvedErrors;
  const items: Array<{
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: number | string;
    tone: "ok" | "warn" | "bad";
    to?: string;
  }> = [
    { icon: Wrench, label: "Maintenance", value: data.maintenanceMode ? "ON" : "off", tone: data.maintenanceMode ? "warn" : "ok", to: "/admin/maintenance" },
    { icon: ServerCrash, label: "Errors (24h)", value: errorsTotal, tone: errorsTotal === 0 ? "ok" : errorsTotal < 10 ? "warn" : "bad", to: "/admin/debug" },
    { icon: ShieldAlert, label: "Failed payments (24h)", value: c.failedPayments24h, tone: c.failedPayments24h === 0 ? "ok" : c.failedPayments24h < 5 ? "warn" : "bad", to: "/admin/payments" },
    { icon: Activity, label: "Pending top-ups", value: c.pendingTopups, tone: c.pendingTopups === 0 ? "ok" : c.pendingTopups < 10 ? "warn" : "bad", to: "/admin/topups" },
  ];
  const toneRing: Record<"ok" | "warn" | "bad", string> = {
    ok: "ring-emerald-400/20 bg-emerald-500/[0.06] text-emerald-200 hover:ring-emerald-400/40",
    warn: "ring-amber-400/30 bg-amber-500/[0.08] text-amber-200 hover:ring-amber-400/50",
    bad: "ring-rose-400/40 bg-rose-500/[0.1] text-rose-200 hover:ring-rose-400/60",
  };
  const toneDot: Record<"ok" | "warn" | "bad", string> = {
    ok: "bg-emerald-400",
    warn: "bg-amber-400 animate-pulse",
    bad: "bg-rose-400 animate-pulse",
  };
  return (
    <div className="mb-1">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          <Activity className="h-3 w-3" /> System health
        </div>
        {onRefresh && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onRefresh}
            disabled={isFetching}
            title="Refresh health"
            className="h-7 rounded-full px-2 text-[11px] text-slate-400 hover:text-slate-100 disabled:opacity-50"
          >
            <RefreshCw className={`mr-1 h-3 w-3 ${isFetching ? "animate-spin" : ""}`} />
            {isFetching ? "Refreshing" : "Refresh"}
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {items.map((it) => {
          const inner = (
            <>
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/5">
                <it.icon className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide opacity-80">
                  <span className={`h-1.5 w-1.5 rounded-full ${toneDot[it.tone]}`} />
                  <span className="truncate">{it.label}</span>
                </div>
                <div className="mt-0.5 font-display text-base font-bold leading-tight text-slate-100 sm:text-lg">
                  {it.value}
                </div>
              </div>
            </>
          );
          const cls = `group flex items-center gap-2.5 rounded-xl border border-white/10 px-3 py-2.5 ring-1 ring-inset transition-all hover:-translate-y-0.5 ${toneRing[it.tone]}`;
          return it.to ? (
            <Link key={it.label} to={it.to} className={cls}>{inner}</Link>
          ) : (
            <div key={it.label} className={cls}>{inner}</div>
          );
        })}
      </div>
    </div>
  );
}

type ChartsData = {
  days: Array<{ date: string; users: number; listings: number; revenue: number }>;
  byCategory: Array<{ name: string; value: number }>;
  byStatus: Array<{ name: string; value: number }>;
} | null;

function ChartsGrid({ charts }: { charts: ChartsData }) {
  // Unique IDs per chart instance — avoids Recharts <defs> collisions
  // when multiple charts share the same SVG layer.
  const uid = useId().replace(/:/g, "");
  const idUsers = `${uid}-users`;
  const idListings = `${uid}-listings`;
  const idRevenue = `${uid}-revenue`;
  const idCat = `${uid}-cat`;
  return (
    <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <ChartCard title="Signups & listings">
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={charts?.days ?? []}>
            <defs>
              <linearGradient id={idUsers} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7c5cff" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#7c5cff" stopOpacity={0} />
              </linearGradient>
              <linearGradient id={idListings} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c1c3" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#22c1c3" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 4" opacity={0.12} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} interval={4} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
            <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area type="monotone" dataKey="users" stroke="none" fill={`url(#${idUsers})`} />
            <Area type="monotone" dataKey="listings" stroke="none" fill={`url(#${idListings})`} />
            <Line type="monotone" dataKey="users" stroke="#7c5cff" strokeWidth={2.5} dot={false} activeDot={{ r: 5, strokeWidth: 0, fill: "#a78bfa" }} />
            <Line type="monotone" dataKey="listings" stroke="#22c1c3" strokeWidth={2.5} dot={false} activeDot={{ r: 5, strokeWidth: 0, fill: "#5eead4" }} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard title="Revenue per day">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={charts?.days ?? []}>
            <defs>
              <linearGradient id={idRevenue} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ff7a59" stopOpacity={1} />
                <stop offset="100%" stopColor="#ff7a59" stopOpacity={0.3} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} interval={4} />
            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
            <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10 }} />
            <Bar dataKey="revenue" fill={`url(#${idRevenue})`} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard title="Listings by category">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={charts?.byCategory ?? []}>
            <defs>
              <linearGradient id={idCat} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#36c172" stopOpacity={1} />
                <stop offset="100%" stopColor="#36c172" stopOpacity={0.3} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} interval={0} angle={-20} textAnchor="end" height={60} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
            <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10 }} />
            <Bar dataKey="value" fill={`url(#${idCat})`} radius={[6, 6, 0, 0]} />
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
  );
}


function SectionDivider({ label }: { label: string }) {
  return (
    <div className="mt-5 mb-3 flex items-center gap-3">
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</span>
      <span className="h-px flex-1 bg-gradient-to-r from-white/10 via-white/5 to-transparent" />
    </div>
  );
}

function HeroStrip({
  lastUpdated,
  onRefresh,
  loading,
}: {
  lastUpdated: number;
  onRefresh: () => void;
  loading: boolean;
}) {
  const hour = new Date().getHours();
  const greeting = hour < 5 ? "Working late" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return (
    <div className="relative mb-4 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-500/10 via-fuchsia-500/[0.06] to-transparent p-4 sm:p-5">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-indigo-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-fuchsia-500/10 blur-3xl" />
      <div className="relative flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-indigo-200/80">
            <Sparkles className="h-3 w-3" />
            <span>Mission control</span>
          </div>
          <div className="mt-1 font-display text-lg font-semibold text-slate-100 sm:text-xl">
            {greeting}, admin
          </div>
          <div className="mt-0.5 text-xs text-slate-400">
            {lastUpdated > 0 ? (
              <>Last refresh {formatDistanceToNow(new Date(lastUpdated), { addSuffix: true })}</>
            ) : (
              <>Live data</>
            )}
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={onRefresh}
          disabled={loading}
          className="h-8 shrink-0 rounded-full border-white/15 bg-white/5 text-xs text-slate-100 hover:bg-white/10 disabled:opacity-50"
        >
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Refreshing…" : "Refresh all"}
        </Button>
      </div>
    </div>
  );
}


