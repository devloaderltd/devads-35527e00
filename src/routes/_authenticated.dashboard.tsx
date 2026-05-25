import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Eye, Heart, MessageSquare, TrendingUp, Plus } from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { format, subDays, startOfDay } from "date-fns";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Marketly" }, { name: "robots", content: "noindex" }] }),
  component: DashboardPage,
});

const COLORS = ["#7c5cff", "#22c1c3", "#ff7a59", "#36c172", "#ffb454", "#e94aa8", "#5aa9ff", "#9a8cff"];

function DashboardPage() {
  const { user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const uid = user!.id;
      const [listingsRes, favsRes, threadsRes] = await Promise.all([
        supabase.from("listings")
          .select("id, title, status, view_count, created_at, bumped_at, category_id, city_id")
          .eq("user_id", uid),
        supabase.from("favorites").select("listing_id", { count: "exact", head: false })
          .in("listing_id",
            (await supabase.from("listings").select("id").eq("user_id", uid)).data?.map(l => l.id) ?? ["00000000-0000-0000-0000-000000000000"]
          ),
        supabase.from("message_threads")
          .select("id, last_message_at, listing_id, buyer_id, seller_id")
          .or(`buyer_id.eq.${uid},seller_id.eq.${uid}`),
      ]);
      const listings = listingsRes.data ?? [];
      const totalViews = listings.reduce((s, l) => s + (l.view_count ?? 0), 0);
      const active = listings.filter(l => l.status === "active").length;
      return {
        listings,
        totalListings: listings.length,
        activeListings: active,
        totalViews,
        totalFavorites: favsRes.data?.length ?? 0,
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
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Your <span className="gradient-text">dashboard</span></h1>
          <p className="text-sm text-muted-foreground">Welcome back{user?.email ? `, ${user.email}` : ""}.</p>
        </div>
        <Button asChild className="btn-gradient rounded-full border-0">
          <Link to="/post"><Plus className="mr-1 h-4 w-4" /> New listing</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <KpiCard icon={<Package className="h-5 w-5" />} label="Total listings" value={stats?.totalListings ?? "—"} />
        <KpiCard icon={<TrendingUp className="h-5 w-5" />} label="Active" value={stats?.activeListings ?? "—"} />
        <KpiCard icon={<Eye className="h-5 w-5" />} label="Total views" value={stats?.totalViews ?? "—"} />
        <KpiCard icon={<Heart className="h-5 w-5" />} label="Favorites" value={stats?.totalFavorites ?? "—"} />
        <KpiCard icon={<MessageSquare className="h-5 w-5" />} label="Conversations" value={stats?.threadCount ?? "—"} />
      </div>

      <Tabs defaultValue="analytics" className="mt-8">
        <TabsList className="rounded-full bg-white/60 backdrop-blur dark:bg-white/10">
          <TabsTrigger value="analytics" className="rounded-full">Analytics</TabsTrigger>
          <TabsTrigger value="listings" className="rounded-full">My Listings</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
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

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="rounded-2xl border-0 bg-white/70 backdrop-blur dark:bg-white/5">
      <CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
