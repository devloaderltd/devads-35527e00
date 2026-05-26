import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format, subDays, startOfDay, formatDistanceToNow } from "date-fns";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { Users, Package, DollarSign, Flag, Wallet, Bitcoin, TrendingUp, AlertCircle } from "lucide-react";
import { SeedDemoButton } from "@/components/admin/SeedDemoButton";
import { panelCls, AdminPageHeader } from "@/components/admin/ui";
import { KpiTile } from "@/components/admin/KpiTile";
import {
  getQuickStats, getRecentActivity, getDashboardSparklines, getFunnelStats,
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

  const [range, setRange] = useState<RangeDays>(30);
  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(RANGE_KEY) : null;
    if (saved === "7" || saved === "30" || saved === "90") setRange(Number(saved) as RangeDays);
  }, []);
  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem(RANGE_KEY, String(range));
  }, [range]);

  const overview = useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const [usersRes, listingsRes, paymentsRes, openReportsRes, catsRes, citiesRes] = await Promise.all([
        supabase.from("profiles").select("id, created_at"),
        supabase.from("listings").select("id, status, created_at, category_id, city_id"),
        supabase.from("payments").select("amount, status, created_at, promotion_type"),
        supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("categories").select("id, name"),
        supabase.from("cities").select("id, name"),
      ]);
      return {
        users: usersRes.data ?? [],
        listings: listingsRes.data ?? [],
        payments: paymentsRes.data ?? [],
        openReports: openReportsRes.count ?? 0,
        categories: catsRes.data ?? [],
        cities: citiesRes.data ?? [],
      };
    },
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

  const data = overview.data;

  const charts = useMemo(() => {
    if (!data) return null;
    const days: { date: string; users: number; listings: number; revenue: number }[] = [];
    for (let i = range - 1; i >= 0; i--) {
      const d = startOfDay(subDays(new Date(), i));
      const t = d.getTime();
      days.push({
        date: format(d, "MMM d"),
        users: data.users.filter(u => startOfDay(new Date(u.created_at)).getTime() === t).length,
        listings: data.listings.filter(l => startOfDay(new Date(l.created_at)).getTime() === t).length,
        revenue: data.payments.filter(p => p.status === "completed" && startOfDay(new Date(p.created_at)).getTime() === t).reduce((s, p) => s + Number(p.amount ?? 0), 0),
      });
    }
    const catMap = new Map<string, number>();
    data.listings.forEach(l => { const n = data.categories.find(c => c.id === l.category_id)?.name ?? "Other"; catMap.set(n, (catMap.get(n) ?? 0) + 1); });
    const statusMap = new Map<string, number>();
    data.listings.forEach(l => statusMap.set(l.status, (statusMap.get(l.status) ?? 0) + 1));
    return {
      days,
      byCategory: [...catMap.entries()].map(([name, value]) => ({ name, value })),
      byStatus: [...statusMap.entries()].map(([name, value]) => ({ name, value })),
    };
  }, [data, range]);

  const totalRevenue = (data?.payments ?? []).filter(p => p.status === "completed").reduce((s, p) => s + Number(p.amount ?? 0), 0);
  const active = (data?.listings ?? []).filter(l => l.status === "active").length;
  const newUsers7d = (data?.users ?? []).filter(u => new Date(u.created_at).getTime() > Date.now() - 7 * 86400000).length;

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

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
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
        <KpiTile icon={<Users className="h-4 w-4" />} label="Total users" value={data?.users.length ?? "—"} accent="#22c1c3" />
        <KpiTile icon={<Flag className="h-4 w-4" />} label="Open reports" value={data?.openReports ?? "—"} accent="#ff7a59" />
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
        <h2 className="mb-2 font-display text-lg font-semibold text-slate-100">Recent activity</h2>
        <div className={panelCls + " divide-y divide-white/5"}>
          {(activity.data?.items ?? []).map((item, i) => (
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

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <Card className={panelCls + " border-0"}>
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-[10px] uppercase tracking-wide sm:text-xs">{label}</span>
          <span className="text-indigo-300">{icon}</span>
        </div>
        <div className="mt-1.5 font-display text-lg font-bold text-slate-100 sm:mt-2 sm:text-2xl">{value}</div>
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
