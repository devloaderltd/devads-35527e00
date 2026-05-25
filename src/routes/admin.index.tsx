import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ShieldAlert, Users, Package, DollarSign, Flag, Eye, Trash2 } from "lucide-react";
import { formatDistanceToNow, format, subDays, startOfDay } from "date-fns";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { SeedDemoButton } from "@/components/admin/SeedDemoButton";
import { AdminShell } from "@/components/admin/AdminShell";
import { getMyRoles } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Admin — Marketly" }, { name: "robots", content: "noindex" }] }),
  component: AdminPage,
});

const COLORS = ["#7c5cff", "#22c1c3", "#ff7a59", "#36c172", "#ffb454", "#e94aa8", "#5aa9ff", "#9a8cff"];

function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const fetchMyRoles = useServerFn(getMyRoles);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/admin/login", search: { redirect: "/admin" }, replace: true });
    }
  }, [authLoading, user, navigate]);

  const rolesQ = useQuery({
    queryKey: ["my-roles", user?.id],
    enabled: !authLoading && !!user,
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async () => (await fetchMyRoles()).roles,
    retry: 2,
  });
  const roles = rolesQ.data;
  const isAdmin = roles?.includes("admin");
  const isMod = isAdmin || roles?.includes("moderator");

  if (authLoading || !user || rolesQ.isLoading || (rolesQ.isFetching && roles === undefined)) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-950 text-slate-400">Loading admin…</div>
    );
  }

  if (rolesQ.error) {
    return (
      <AdminShell email={user.email}>
        <div className="grid place-items-center py-20 text-center">
          <ShieldAlert className="mb-3 h-10 w-10 text-red-400" />
          <h1 className="font-display text-xl font-bold">Couldn't verify your roles</h1>
          <p className="mt-1 max-w-md text-sm text-slate-400">{String(rolesQ.error)}</p>
          <Button variant="outline" className="mt-4 rounded-full border-white/20 bg-white/5 text-slate-100 hover:bg-white/10" onClick={() => rolesQ.refetch()}>Retry</Button>
        </div>
      </AdminShell>
    );
  }

  if (!isMod) {
    const signOut = async () => {
      await supabase.auth.signOut();
      navigate({ to: "/admin/login", replace: true });
    };
    return (
      <AdminShell email={user.email}>
        <div className="grid place-items-center py-20 text-center">
          <ShieldAlert className="mb-3 h-10 w-10 text-slate-400" />
          <h1 className="font-display text-xl font-bold">Not authorized</h1>
          <p className="mt-1 max-w-md text-sm text-slate-400">This account doesn't have admin access.</p>
          <Button onClick={signOut} className="mt-4 rounded-full border-0 bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white">Sign in as admin</Button>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell email={user.email}>
      <div className="mb-5 sm:mb-6">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Admin <span className="bg-gradient-to-r from-indigo-400 to-fuchsia-400 bg-clip-text text-transparent">control</span></h1>
        <p className="text-xs text-slate-400 sm:text-sm">Manage users, listings, payments and reports.</p>
      </div>

      <Tabs defaultValue="overview">
        <div className="-mx-3 overflow-x-auto px-3 no-scrollbar sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-max rounded-full bg-white/5">
            <TabsTrigger value="overview" className="rounded-full data-[state=active]:bg-white/10">Overview</TabsTrigger>
            {isAdmin && <TabsTrigger value="users" className="rounded-full data-[state=active]:bg-white/10">Users</TabsTrigger>}
            <TabsTrigger value="listings" className="rounded-full data-[state=active]:bg-white/10">Listings</TabsTrigger>
            {isAdmin && <TabsTrigger value="payments" className="rounded-full data-[state=active]:bg-white/10">Payments</TabsTrigger>}
            <TabsTrigger value="reports" className="rounded-full data-[state=active]:bg-white/10">Reports</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-4"><OverviewTab isAdmin={!!isAdmin} /></TabsContent>
        {isAdmin && <TabsContent value="users" className="mt-4"><UsersTab /></TabsContent>}
        <TabsContent value="listings" className="mt-4"><ListingsTab /></TabsContent>
        {isAdmin && <TabsContent value="payments" className="mt-4"><PaymentsTab /></TabsContent>}
        <TabsContent value="reports" className="mt-4"><ReportsTab /></TabsContent>
      </Tabs>
    </AdminShell>
  );
}

const panelCls = "rounded-2xl border border-white/10 bg-white/5 backdrop-blur";

/* -------------------- Overview -------------------- */
function OverviewTab({ isAdmin }: { isAdmin: boolean }) {
  const { data } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const [usersCount, listings, payments, reportsOpen] = await Promise.all([
        supabase.from("profiles").select("id, created_at"),
        supabase.from("listings").select("id, status, created_at, category_id, city_id"),
        isAdmin ? supabase.from("payments").select("amount, currency, status, created_at, promotion_type") : Promise.resolve({ data: [] } as any),
        supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
      ]);
      const [cats, cities] = await Promise.all([
        supabase.from("categories").select("id, name"),
        supabase.from("cities").select("id, name"),
      ]);
      return {
        users: usersCount.data ?? [],
        listings: listings.data ?? [],
        payments: payments.data ?? [],
        openReports: (reportsOpen as { count: number | null }).count ?? 0,
        categories: cats.data ?? [],
        cities: cities.data ?? [],
      };
    },
  });

  const charts = useMemo(() => {
    if (!data) return null;
    const days: { date: string; users: number; listings: number; revenue: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = startOfDay(subDays(new Date(), i));
      const label = format(d, "MMM d");
      const userCount = data.users.filter(u => startOfDay(new Date(u.created_at)).getTime() === d.getTime()).length;
      const lCount = data.listings.filter(l => startOfDay(new Date(l.created_at)).getTime() === d.getTime()).length;
      const rev = data.payments
        .filter((p: any) => p.status === "completed" && startOfDay(new Date(p.created_at)).getTime() === d.getTime())
        .reduce((s: number, p: any) => s + Number(p.amount ?? 0), 0);
      days.push({ date: label, users: userCount, listings: lCount, revenue: rev });
    }

    const catMap = new Map<string, number>();
    data.listings.forEach(l => {
      const name = data.categories.find(c => c.id === l.category_id)?.name ?? "Other";
      catMap.set(name, (catMap.get(name) ?? 0) + 1);
    });
    const byCategory = [...catMap.entries()].map(([name, value]) => ({ name, value }));

    const cityMap = new Map<string, number>();
    data.listings.forEach(l => {
      const name = data.cities.find(c => c.id === l.city_id)?.name ?? "Unknown";
      cityMap.set(name, (cityMap.get(name) ?? 0) + 1);
    });
    const byCity = [...cityMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, value]) => ({ name, value }));

    const statusMap = new Map<string, number>();
    data.listings.forEach(l => statusMap.set(l.status, (statusMap.get(l.status) ?? 0) + 1));
    const byStatus = [...statusMap.entries()].map(([name, value]) => ({ name, value }));

    return { days, byCategory, byCity, byStatus };
  }, [data]);

  const totalRevenue = (data?.payments ?? []).filter((p: any) => p.status === "completed").reduce((s: number, p: any) => s + Number(p.amount ?? 0), 0);
  const active = (data?.listings ?? []).filter(l => l.status === "active").length;

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard icon={<Users className="h-5 w-5" />} label="Users" value={data?.users.length ?? "—"} />
        <KpiCard icon={<Package className="h-5 w-5" />} label="Active listings" value={active} />
        {isAdmin && <KpiCard icon={<DollarSign className="h-5 w-5" />} label="Revenue (USD)" value={`$${totalRevenue.toFixed(2)}`} />}
        <KpiCard icon={<Flag className="h-5 w-5" />} label="Open reports" value={data?.openReports ?? "—"} />
      </div>

      {isAdmin && <div className="mt-4"><SeedDemoButton /></div>}

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="New signups & listings (30 days)">
          <ResponsiveContainer width="100%" height={260}>
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

        {isAdmin && (
          <ChartCard title="Revenue per day (30 days)">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={charts?.days ?? []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} interval={4} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)" }} />
                <Bar dataKey="revenue" fill="#ff7a59" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        <ChartCard title="Listings by category">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={charts?.byCategory ?? []}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)" }} />
              <Bar dataKey="value" fill="#36c172" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top 10 cities">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={charts?.byCity ?? []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)" }} />
              <Bar dataKey="value" fill="#5aa9ff" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Listing status distribution">
          <ResponsiveContainer width="100%" height={260}>
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
    </div>
  );
}

/* -------------------- Users -------------------- */
function UsersTab() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const { data: users } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, display_name, created_at, city_id").order("created_at", { ascending: false }).limit(200);
      const ids = data?.map(u => u.id) ?? [];
      const { data: roles } = ids.length
        ? await supabase.from("user_roles").select("user_id, role").in("user_id", ids)
        : { data: [] as { user_id: string; role: string }[] };
      return (data ?? []).map(u => ({ ...u, roles: roles?.filter(r => r.user_id === u.id).map(r => r.role) ?? [] }));
    },
  });

  const setRole = useMutation({
    mutationFn: async ({ userId, role, add }: { userId: string; role: "admin" | "moderator"; add: boolean }) => {
      if (add) {
        const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
        if (error && !error.message.includes("duplicate")) throw error;
      } else {
        const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); toast.success("Role updated"); },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = (users ?? []).filter(u => !q || u.display_name?.toLowerCase().includes(q.toLowerCase()));

  return (
    <Card className={panelCls + " border-0"}>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-base text-slate-100">Users ({users?.length ?? 0})</CardTitle>
        <Input placeholder="Search name…" value={q} onChange={(e) => setQ(e.target.value)} className="w-full rounded-full border-white/10 bg-white/5 text-slate-100 sm:max-w-xs" />
      </CardHeader>
      <CardContent className="p-0">
        {/* Mobile: stacked cards */}
        <div className="space-y-2 p-3 md:hidden">
          {filtered.map((u) => (
            <div key={u.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-medium text-slate-100">{u.display_name}</div>
                  <div className="mt-0.5 text-xs text-slate-400">Joined {format(new Date(u.created_at), "MMM d, yyyy")}</div>
                </div>
                <div className="flex flex-wrap justify-end gap-1">
                  {u.roles.map(r => <Badge key={r} variant={r === "admin" ? "default" : "secondary"} className="capitalize">{r}</Badge>)}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" className="flex-1 rounded-full border-white/20 bg-white/5 text-slate-100 hover:bg-white/10"
                  onClick={() => setRole.mutate({ userId: u.id, role: "moderator", add: !u.roles.includes("moderator") })}>
                  {u.roles.includes("moderator") ? "Demote mod" : "Make mod"}
                </Button>
                <Button size="sm" variant="outline" className="flex-1 rounded-full border-white/20 bg-white/5 text-slate-100 hover:bg-white/10"
                  onClick={() => setRole.mutate({ userId: u.id, role: "admin", add: !u.roles.includes("admin") })}>
                  {u.roles.includes("admin") ? "Demote admin" : "Make admin"}
                </Button>
              </div>
            </div>
          ))}
          {!filtered.length && <div className="px-2 py-8 text-center text-sm text-slate-400">No users.</div>}
        </div>
        {/* Desktop table */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-left text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Roles</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-t border-white/10">
                  <td className="px-4 py-3 font-medium text-slate-100">{u.display_name}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {u.roles.map(r => <Badge key={r} variant={r === "admin" ? "default" : "secondary"} className="capitalize">{r}</Badge>)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{format(new Date(u.created_at), "MMM d, yyyy")}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-2">
                      <Button size="sm" variant="outline" className="rounded-full border-white/20 bg-white/5 text-slate-100 hover:bg-white/10"
                        onClick={() => setRole.mutate({ userId: u.id, role: "moderator", add: !u.roles.includes("moderator") })}>
                        {u.roles.includes("moderator") ? "Demote mod" : "Make mod"}
                      </Button>
                      <Button size="sm" variant="outline" className="rounded-full border-white/20 bg-white/5 text-slate-100 hover:bg-white/10"
                        onClick={() => setRole.mutate({ userId: u.id, role: "admin", add: !u.roles.includes("admin") })}>
                        {u.roles.includes("admin") ? "Demote admin" : "Make admin"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

/* -------------------- Listings -------------------- */
function ListingsTab() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const { data } = useQuery({
    queryKey: ["admin-listings"],
    queryFn: async () => {
      const { data } = await supabase.from("listings")
        .select("id, title, status, view_count, created_at, user_id, price, currency")
        .order("created_at", { ascending: false }).limit(200);
      return data ?? [];
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("listings").update({ status: "removed" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-listings"] }); toast.success("Removed"); },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = (data ?? []).filter(l => !q || l.title.toLowerCase().includes(q.toLowerCase()));

  return (
    <Card className={panelCls + " border-0"}>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-base text-slate-100">Listings ({data?.length ?? 0})</CardTitle>
        <Input placeholder="Search title…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs rounded-full border-white/10 bg-white/5 text-slate-100" />
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-left text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Views</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id} className="border-t border-white/10">
                  <td className="px-4 py-3 font-medium text-slate-100">{l.title}</td>
                  <td className="px-4 py-3"><Badge variant={l.status === "active" ? "default" : "secondary"} className="capitalize">{l.status}</Badge></td>
                  <td className="px-4 py-3 text-slate-300">{l.price ? `${l.currency} ${Number(l.price).toFixed(2)}` : "—"}</td>
                  <td className="px-4 py-3 text-slate-300">{l.view_count ?? 0}</td>
                  <td className="px-4 py-3 text-slate-400">{format(new Date(l.created_at), "MMM d")}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-2">
                      <Button asChild size="sm" variant="outline" className="rounded-full border-white/20 bg-white/5 text-slate-100 hover:bg-white/10">
                        <a href={`/listings/${l.id}`} target="_blank" rel="noopener noreferrer"><Eye className="h-3.5 w-3.5" /></a>
                      </Button>
                      {l.status !== "removed" && (
                        <Button size="sm" variant="destructive" className="rounded-full" onClick={() => remove.mutate(l.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

/* -------------------- Payments -------------------- */
function PaymentsTab() {
  const { data } = useQuery({
    queryKey: ["admin-payments"],
    queryFn: async () => {
      const { data } = await supabase.from("payments")
        .select("id, user_id, listing_id, amount, currency, status, provider, promotion_type, created_at")
        .order("created_at", { ascending: false }).limit(200);
      return data ?? [];
    },
  });

  return (
    <Card className={panelCls + " border-0"}>
      <CardHeader><CardTitle className="text-base text-slate-100">Payments ({data?.length ?? 0})</CardTitle></CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-left text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map(p => (
                <tr key={p.id} className="border-t border-white/10">
                  <td className="px-4 py-3 text-slate-400">{format(new Date(p.created_at), "MMM d, HH:mm")}</td>
                  <td className="px-4 py-3 font-medium text-slate-100">{p.currency} {Number(p.amount).toFixed(2)}</td>
                  <td className="px-4 py-3 capitalize text-slate-300">{p.promotion_type ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-300">{p.provider}</td>
                  <td className="px-4 py-3"><Badge variant={p.status === "completed" ? "default" : "secondary"} className="capitalize">{p.status}</Badge></td>
                </tr>
              ))}
              {!data?.length && <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">No payments yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

/* -------------------- Reports -------------------- */
function ReportsTab() {
  const qc = useQueryClient();
  const { data: reports } = useQuery({
    queryKey: ["admin-reports"],
    queryFn: async () => {
      const { data: rs } = await supabase.from("reports")
        .select("id, listing_id, reporter_id, reason, details, status, created_at")
        .order("created_at", { ascending: false }).limit(200);
      if (!rs) return [];
      const listingIds = [...new Set(rs.map(r => r.listing_id))];
      const { data: listings } = listingIds.length
        ? await supabase.from("listings").select("id, title, status, user_id").in("id", listingIds)
        : { data: [] as any[] };
      return rs.map(r => ({ ...r, listing: listings?.find(l => l.id === r.listing_id) }));
    },
  });

  const resolveReport = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "resolved" | "dismissed" }) => {
      const { error } = await supabase.from("reports").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-reports"] }); toast.success("Updated"); },
  });

  const removeListing = useMutation({
    mutationFn: async (listingId: string) => {
      const { error } = await supabase.from("listings").update({ status: "removed" }).eq("id", listingId);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-reports"] }); toast.success("Listing removed"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      {reports?.length === 0 && <div className={panelCls + " p-10 text-center text-sm text-slate-400"}>No reports.</div>}
      {reports?.map((r) => (
        <div key={r.id} className={panelCls + " p-4"}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant={r.status === "open" ? "default" : "secondary"} className="capitalize">{r.status}</Badge>
                <span className="text-sm font-medium text-slate-100">{r.reason}</span>
              </div>
              {r.listing ? (
                <a href={`/listings/${r.listing.id}`} target="_blank" rel="noopener noreferrer" className="mt-1 block text-sm text-indigo-300 hover:underline">{r.listing.title}</a>
              ) : <span className="text-sm text-slate-400">Listing deleted</span>}
              {r.details && <p className="mt-2 max-w-xl whitespace-pre-wrap text-sm text-slate-400">{r.details}</p>}
              <div className="mt-1 text-xs text-slate-500">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              {r.listing && r.listing.status !== "removed" && (
                <Button size="sm" variant="destructive" className="rounded-full" onClick={() => removeListing.mutate(r.listing!.id)}>Remove listing</Button>
              )}
              {r.status === "open" && (
                <>
                  <Button size="sm" variant="outline" className="rounded-full border-white/20 bg-white/5 text-slate-100 hover:bg-white/10" onClick={() => resolveReport.mutate({ id: r.id, status: "dismissed" })}>Dismiss</Button>
                  <Button size="sm" className="rounded-full border-0 bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white" onClick={() => resolveReport.mutate({ id: r.id, status: "resolved" })}>Resolve</Button>
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* -------------------- shared -------------------- */
function KpiCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <Card className={panelCls + " border-0"}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-xs uppercase tracking-wide">{label}</span>
          <span className="text-indigo-300">{icon}</span>
        </div>
        <div className="mt-2 font-display text-2xl font-bold text-slate-100">{value}</div>
      </CardContent>
    </Card>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className={panelCls + " border-0"}>
      <CardHeader className="pb-2"><CardTitle className="text-base text-slate-100">{title}</CardTitle></CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
