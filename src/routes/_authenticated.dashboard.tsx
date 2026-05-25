import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Eye, Heart, MessageSquare, TrendingUp, Plus, BarChart3, Wallet, BookmarkCheck, Search, Activity, Phone, Star } from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend, AreaChart, Area,
} from "recharts";
import { format, subDays, startOfDay, formatDistanceToNow } from "date-fns";
import { getMyListingAnalytics } from "@/lib/extras.functions";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { DashboardWorkspaceSidebar } from "@/components/DashboardWorkspaceSidebar";
import { OnboardingChecklist } from "@/components/OnboardingChecklist";
import { ExpiringSoonCard } from "@/components/ExpiringSoonCard";
import { DashboardReviewsPanel } from "@/components/DashboardReviewsPanel";

const dashboardSearchSchema = z.object({
  tab: z.enum(["analytics", "performance", "listings", "reviews"]).optional(),
});

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — CallEscort24" }, { name: "robots", content: "noindex" }] }),
  validateSearch: dashboardSearchSchema,
  component: DashboardShell,
});

function DashboardShell() {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="flex w-full">
        <DashboardWorkspaceSidebar />
        <SidebarInset className="min-w-0 flex-1">
          <div className="flex items-center gap-2 border-b border-border/40 bg-white/40 px-3 py-2 backdrop-blur dark:bg-white/5 sm:px-4">
            <SidebarTrigger />
            <span className="text-xs font-medium text-muted-foreground">Workspace</span>
          </div>
          <DashboardPage />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}


const COLORS = ["#7c5cff", "#22c1c3", "#ff7a59", "#36c172", "#ffb454", "#e94aa8", "#5aa9ff", "#9a8cff"];

function DashboardPage() {
  const { user } = useAuth();

  const { data: wallet } = useQuery({
    queryKey: ["wallet-balance", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("wallets").select("balance_usd").eq("user_id", user!.id).maybeSingle();
      return data?.balance_usd ?? 0;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const uid = user!.id;
      const listingsRes = await supabase.from("listings")
        .select("id, title, status, view_count, created_at, bumped_at, category_id, city_id")
        .eq("user_id", uid);
      const listings = listingsRes.data ?? [];
      const ids = listings.map(l => l.id);

      const [favsRes, threadsRes] = await Promise.all([
        ids.length
          ? supabase.from("favorites").select("listing_id", { count: "exact", head: true }).in("listing_id", ids)
          : Promise.resolve({ count: 0 } as { count: number }),
        supabase.from("message_threads")
          .select("id, last_message_at, listing_id, buyer_id, seller_id")
          .or(`buyer_id.eq.${uid},seller_id.eq.${uid}`),
      ]);

      const totalViews = listings.reduce((s, l) => s + (l.view_count ?? 0), 0);
      const active = listings.filter(l => l.status === "active").length;
      return {
        listings,
        totalListings: listings.length,
        activeListings: active,
        totalViews,
        totalFavorites: (favsRes as { count: number | null }).count ?? 0,
        threadCount: threadsRes.data?.length ?? 0,
      };
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["categories-lookup"],
    queryFn: async () => (await supabase.from("categories").select("id, name")).data ?? [],
  });

  const charts = useMemo(() => {
    if (!stats) return null;
    const listings = stats.listings;

    // Listings created per day (last 30 days)
    const days: { date: string; created: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = startOfDay(subDays(new Date(), i));
      const label = format(d, "MMM d");
      const count = listings.filter(l => startOfDay(new Date(l.created_at)).getTime() === d.getTime()).length;
      days.push({ date: label, created: count });
    }

    // Top 10 listings by views
    const top = [...listings]
      .sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0))
      .slice(0, 10)
      .map(l => ({ name: l.title.length > 20 ? l.title.slice(0, 20) + "…" : l.title, views: l.view_count ?? 0 }));

    // Pie by category
    const byCat = new Map<string, number>();
    listings.forEach(l => {
      const name = categories?.find(c => c.id === l.category_id)?.name ?? "Other";
      byCat.set(name, (byCat.get(name) ?? 0) + 1);
    });
    const catData = [...byCat.entries()].map(([name, value]) => ({ name, value }));

    // Status distribution
    const statusMap = new Map<string, number>();
    listings.forEach(l => statusMap.set(l.status, (statusMap.get(l.status) ?? 0) + 1));
    const statusData = [...statusMap.entries()].map(([name, value]) => ({ name, value }));

    return { days, top, catData, statusData };
  }, [stats, categories]);

  return (
    <div className="container mx-auto px-3 py-6 sm:px-4 sm:py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Your <span className="gradient-text">dashboard</span></h1>
          <p className="truncate text-xs text-muted-foreground sm:text-sm">Welcome back{user?.email ? `, ${user.email}` : ""}.</p>
        </div>
        <Button asChild className="btn-gradient rounded-full border-0">
          <Link to="/post"><Plus className="mr-1 h-4 w-4" /> New listing</Link>
        </Button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <QuickAction to="/post" icon={<Plus className="h-4 w-4" />} label="New listing" accent />
        <QuickAction to="/saved-searches" icon={<BookmarkCheck className="h-4 w-4" />} label="Saved searches" />
        <QuickAction to="/messages" icon={<MessageSquare className="h-4 w-4" />} label="Messages" />
        <QuickAction to="/wallet" icon={<Wallet className="h-4 w-4" />} label={`Wallet · $${Number(wallet ?? 0).toFixed(2)}`} />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-5">
        <KpiCard icon={<Package className="h-5 w-5" />} label="Total listings" value={stats?.totalListings ?? "—"} />
        <KpiCard icon={<TrendingUp className="h-5 w-5" />} label="Active" value={stats?.activeListings ?? "—"} />
        <KpiCard icon={<Eye className="h-5 w-5" />} label="Total views" value={stats?.totalViews ?? "—"} />
        <KpiCard icon={<Heart className="h-5 w-5" />} label="Favorites" value={stats?.totalFavorites ?? "—"} />
        <KpiCard icon={<MessageSquare className="h-5 w-5" />} label="Conversations" value={stats?.threadCount ?? "—"} />
      </div>

      <Tabs defaultValue="analytics" className="mt-8">
        <div className="-mx-3 overflow-x-auto px-3 no-scrollbar sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-max rounded-full bg-white/60 backdrop-blur dark:bg-white/10">
            <TabsTrigger value="analytics" className="rounded-full">Overview</TabsTrigger>
            <TabsTrigger value="performance" className="rounded-full">Performance</TabsTrigger>
            <TabsTrigger value="listings" className="rounded-full">My Listings</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="analytics" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <OnboardingChecklist userId={user?.id} />
            <ExpiringSoonCard userId={user?.id} />
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartCard title="Listings created (last 30 days)">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={charts?.days ?? []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={4} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="created" stroke="#7c5cff" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Top 10 listings by views">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={charts?.top ?? []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="views" fill="#22c1c3" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="By category">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={charts?.catData ?? []} dataKey="value" nameKey="name" outerRadius={90} label>
                  {(charts?.catData ?? []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="By status">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={charts?.statusData ?? []} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} label>
                  {(charts?.statusData ?? []).map((_, i) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="mt-4 space-y-6">
          <PerformancePanel />
          <RecentActivity userId={user?.id} listings={stats?.listings ?? []} />
        </TabsContent>






        <TabsContent value="listings" className="mt-4">
          <Card className="rounded-2xl border-0 bg-white/70 backdrop-blur dark:bg-white/5">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Title</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Views</th>
                      <th className="px-4 py-3">Created</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(stats?.listings ?? []).map((l) => (
                      <tr key={l.id} className="border-t border-border/40">
                        <td className="px-4 py-3 font-medium">{l.title}</td>
                        <td className="px-4 py-3">
                          <Badge variant={l.status === "active" ? "default" : "secondary"} className="capitalize">{l.status}</Badge>
                        </td>
                        <td className="px-4 py-3">{l.view_count ?? 0}</td>
                        <td className="px-4 py-3 text-muted-foreground">{format(new Date(l.created_at), "MMM d, yyyy")}</td>
                        <td className="px-4 py-3 text-right">
                          <Button asChild size="sm" variant="outline" className="rounded-full">
                            <Link to="/listings/$id" params={{ id: l.id }}>View</Link>
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {(stats?.listings ?? []).length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">No listings yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KpiCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <Card className="rounded-2xl border-0 bg-white/70 backdrop-blur dark:bg-white/5">
      <CardContent className="p-4">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-xs uppercase tracking-wide">{label}</span>
          <span className="text-primary">{icon}</span>
        </div>
        <div className="mt-2 font-display text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function QuickAction({ to, icon, label, accent }: { to: string; icon: React.ReactNode; label: string; accent?: boolean }) {
  return (
    <Link
      to={to as never}
      className={`flex items-center gap-2 rounded-2xl border px-3 py-3 text-sm font-medium transition hover:bg-white/90 ${
        accent
          ? "border-0 bg-gradient-to-r from-primary to-purple-500 text-white hover:opacity-95"
          : "border-white/40 bg-white/70 text-foreground backdrop-blur dark:bg-white/5"
      }`}
    >
      <span className={accent ? "text-white" : "text-primary"}>{icon}</span>
      <span className="truncate">{label}</span>
    </Link>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="rounded-2xl border-0 bg-white/70 backdrop-blur dark:bg-white/5">
      <CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function PerformancePanel() {
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const fn = useServerFn(getMyListingAnalytics);
  const { data, isLoading } = useQuery({
    queryKey: ["my-listing-analytics", days],
    queryFn: () => fn({ data: { days } }),
  });

  const totals = data?.totalsByType ?? {};
  const conv = totals.view ? Math.round(((totals.contact_reveal ?? 0) + (totals.message ?? 0)) / totals.view * 1000) / 10 : 0;
  const topListings = useMemo(() => {
    const map = new Map<string, { id: string; title: string; views: number }>();
    (data?.listings ?? []).forEach((l: any) => map.set(l.id, { id: l.id, title: l.title, views: l.view_count ?? 0 }));
    return [...map.values()].sort((a, b) => b.views - a.views).slice(0, 5);
  }, [data]);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <BarChart3 className="h-4 w-4" /> Engagement on your listings
        </div>
        <div className="flex gap-1 rounded-full border bg-white/50 p-0.5 dark:bg-white/5">
          {([7, 30, 90] as const).map(d => (
            <button key={d} onClick={() => setDays(d)} className={`rounded-full px-3 py-1 text-xs font-medium ${days === d ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{d}d</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <KpiCard icon={<Eye className="h-5 w-5" />} label="Views" value={totals.view ?? 0} />
        <KpiCard icon={<MessageSquare className="h-5 w-5" />} label="Messages" value={totals.message ?? 0} />
        <KpiCard icon={<Heart className="h-5 w-5" />} label="Favorites" value={totals.favorite ?? 0} />
        <KpiCard icon={<TrendingUp className="h-5 w-5" />} label="Conversion" value={`${conv}%`} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title={`Engagement (last ${days} days)`}>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data?.daily ?? []}>
              <defs>
                <linearGradient id="gv" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7c5cff" stopOpacity={0.6} /><stop offset="100%" stopColor="#7c5cff" stopOpacity={0} /></linearGradient>
                <linearGradient id="gm" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22c1c3" stopOpacity={0.6} /><stop offset="100%" stopColor="#22c1c3" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={Math.floor((data?.daily?.length ?? 0) / 8)} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="views" stroke="#7c5cff" fill="url(#gv)" strokeWidth={2} />
              <Area type="monotone" dataKey="messages" stroke="#22c1c3" fill="url(#gm)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top 5 listings by views">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={topListings.map(l => ({ name: l.title.length > 22 ? l.title.slice(0, 22) + "…" : l.title, views: l.views }))} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="views" fill="#ff7a59" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {isLoading && <div className="mt-4 text-center text-sm text-muted-foreground">Loading analytics…</div>}
      {!isLoading && !data?.listings.length && <div className="mt-6 text-center text-sm text-muted-foreground">Post a listing to start collecting analytics.</div>}
    </div>
  );
}

function RecentActivity({ userId, listings }: { userId: string | undefined; listings: { id: string; title: string }[] }) {
  const ids = listings.map((l) => l.id);
  const { data: events } = useQuery({
    queryKey: ["dashboard-activity", userId, ids.length],
    enabled: !!userId && ids.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("listing_events")
        .select("id, listing_id, type, created_at")
        .in("listing_id", ids)
        .order("created_at", { ascending: false })
        .limit(15);
      return data ?? [];
    },
  });

  const titleById = new Map(listings.map((l) => [l.id, l.title]));
  const iconFor: Record<string, React.ReactNode> = {
    view: <Eye className="h-3.5 w-3.5" />,
    favorite: <Heart className="h-3.5 w-3.5" />,
    message: <MessageSquare className="h-3.5 w-3.5" />,
    contact_reveal: <Phone className="h-3.5 w-3.5" />,
  };
  const labelFor: Record<string, string> = {
    view: "Someone viewed",
    favorite: "Someone favorited",
    message: "New message on",
    contact_reveal: "Contact revealed on",
  };

  return (
    <Card className="rounded-2xl border-0 bg-white/70 backdrop-blur dark:bg-white/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4 text-primary" /> Recent activity
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {!events?.length ? (
          <div className="py-6 text-center text-sm text-muted-foreground">No activity yet.</div>
        ) : (
          <ul className="divide-y divide-border/40">
            {events.map((e) => {
              const title = titleById.get(e.listing_id) ?? "your listing";
              return (
                <li key={e.id} className="flex items-center gap-3 py-2.5">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                    {iconFor[e.type] ?? <Activity className="h-3.5 w-3.5" />}
                  </span>
                  <div className="min-w-0 flex-1 text-sm">
                    <span className="text-muted-foreground">{labelFor[e.type] ?? e.type} </span>
                    <Link to="/listings/$id" params={{ id: e.listing_id }} className="font-medium hover:text-primary">
                      {title}
                    </Link>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

