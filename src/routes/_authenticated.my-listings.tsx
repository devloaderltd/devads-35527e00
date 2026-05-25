import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ListingCard } from "@/components/ListingCard";
import { PromoteDialog } from "@/components/PromoteDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MoreVertical, Pencil, Trash2, RefreshCw, Sparkles, AlertTriangle, Plus, Eye, Heart } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/my-listings")({
  head: () => ({ meta: [{ title: "My listings — CallEscort24" }] }),
  component: MyListings,
});

type Row = {
  id: string;
  title: string;
  status: "active" | "expired" | "draft" | "sold" | string;
  created_at: string;
  expires_at: string;
  view_count: number;
  bumped_at: string;
  cities: { name: string; region: string; country: string } | null;
  listing_images: { url: string; sort_order: number }[];
  favCount?: number;
};

type Filter = "all" | "active" | "expired" | "draft";
type Sort = "newest" | "views" | "favorites" | "expiring";

function MyListings() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("newest");

  const { data, isLoading } = useQuery({
    queryKey: ["my-listings", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await supabase
        .from("listings")
        .select(`id, title, status, created_at, expires_at, view_count, bumped_at,
          cities(name, region, country),
          listing_images(url, sort_order)`)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as unknown as Row[];
      const ids = rows.map(r => r.id);
      if (ids.length) {
        const { data: favs } = await supabase
          .from("favorites").select("listing_id").in("listing_id", ids);
        const counts = new Map<string, number>();
        (favs ?? []).forEach(f => counts.set(f.listing_id, (counts.get(f.listing_id) ?? 0) + 1));
        rows.forEach(r => { r.favCount = counts.get(r.id) ?? 0; });
      }
      return rows;
    },
  });

  const counts = useMemo(() => {
    const c = { all: 0, active: 0, expired: 0, draft: 0 };
    (data ?? []).forEach(r => {
      c.all++;
      if (r.status === "active") c.active++;
      else if (r.status === "expired") c.expired++;
      else if (r.status === "draft") c.draft++;
    });
    return c;
  }, [data]);

  const visible = useMemo(() => {
    let rows = [...(data ?? [])];
    if (filter !== "all") rows = rows.filter(r => r.status === filter);
    rows.sort((a, b) => {
      if (sort === "views") return b.view_count - a.view_count;
      if (sort === "favorites") return (b.favCount ?? 0) - (a.favCount ?? 0);
      if (sort === "expiring") return new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime();
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return rows;
  }, [data, filter, sort]);

  const remove = async (id: string) => {
    if (!confirm("Delete this listing? This cannot be undone.")) return;
    const { error } = await supabase.from("listings").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["my-listings"] });
  };

  const markSold = async (id: string) => {
    const { error } = await supabase.from("listings").update({ status: "sold" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Marked as sold");
    qc.invalidateQueries({ queryKey: ["my-listings"] });
  };

  const renew = async (id: string) => {
    const next = new Date(Date.now() + 30 * 86400000).toISOString();
    const { error } = await supabase.from("listings")
      .update({ expires_at: next, status: "active", bumped_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Renewed for 30 days");
    qc.invalidateQueries({ queryKey: ["my-listings"] });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">
            My <span className="gradient-text">listings</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{counts.all} total · {counts.active} active</p>
        </div>
        <Button asChild className="btn-gradient rounded-full border-0">
          <Link to="/post"><Plus className="mr-1 h-4 w-4" /> New listing</Link>
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(["all", "active", "expired", "draft"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition ${
              filter === f
                ? "border-primary bg-primary text-primary-foreground shadow"
                : "border-white/50 bg-white/60 text-muted-foreground hover:bg-white"
            }`}
          >
            {f} · {counts[f]}
          </button>
        ))}
        <div className="ml-auto">
          <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
            <SelectTrigger className="h-8 w-44 rounded-full bg-white/70 text-xs backdrop-blur">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="views">Most viewed</SelectItem>
              <SelectItem value="favorites">Most favorited</SelectItem>
              <SelectItem value="expiring">Expiring soon</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : !visible.length ? (
        <div className="rounded-2xl glass p-10 text-center text-muted-foreground">
          {filter === "all"
            ? <>You don't have any listings yet. <Link to="/post" className="font-medium text-primary hover:underline">Post your first one</Link>.</>
            : <>No {filter} listings.</>}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((l) => {
            const expiresInDays = Math.ceil((new Date(l.expires_at).getTime() - Date.now()) / 86400000);
            const expiringSoon = expiresInDays > 0 && expiresInDays <= 3 && l.status === "active";
            const isExpired = l.status === "expired" || expiresInDays <= 0;
            return (
              <div key={l.id} className="flex flex-col gap-2">
                <div className="relative">
                  <ListingCard listing={l} />
                  <div className="absolute right-2 top-2 z-10">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                          className="grid h-8 w-8 place-items-center rounded-full bg-black/50 text-white backdrop-blur hover:bg-black/70"
                          aria-label="Actions"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl">
                        <DropdownMenuItem asChild>
                          <Link to="/post" search={{ edit: l.id } as never}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                          </Link>
                        </DropdownMenuItem>
                        {(isExpired || expiringSoon) && (
                          <DropdownMenuItem onClick={() => renew(l.id)}>
                            <RefreshCw className="mr-2 h-4 w-4" /> Renew 30 days
                          </DropdownMenuItem>
                        )}
                        {l.status === "active" && (
                          <DropdownMenuItem onClick={() => markSold(l.id)}>
                            <Sparkles className="mr-2 h-4 w-4" /> Mark as sold
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => remove(l.id)} className="text-red-600 focus:text-red-600">
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 px-1 text-[11px]">
                  <Badge variant="secondary" className="gap-1 rounded-full bg-white/70">
                    <Eye className="h-3 w-3" /> {l.view_count}
                  </Badge>
                  <Badge variant="secondary" className="gap-1 rounded-full bg-white/70">
                    <Heart className="h-3 w-3" /> {l.favCount ?? 0}
                  </Badge>
                  {l.status === "active" && !expiringSoon && (
                    <Badge variant="outline" className="rounded-full border-emerald-300/60 bg-emerald-50 text-emerald-700">Active</Badge>
                  )}
                  {expiringSoon && (
                    <Badge className="gap-1 rounded-full bg-amber-100 text-amber-800 hover:bg-amber-100">
                      <AlertTriangle className="h-3 w-3" /> {expiresInDays}d left
                    </Badge>
                  )}
                  {isExpired && (
                    <Badge variant="outline" className="rounded-full border-red-300/60 bg-red-50 text-red-700">Expired</Badge>
                  )}
                  {l.status === "sold" && (
                    <Badge className="rounded-full bg-slate-200 text-slate-800 hover:bg-slate-200">Sold</Badge>
                  )}
                  <span className="ml-auto text-muted-foreground">
                    {formatDistanceToNow(new Date(l.created_at), { addSuffix: true })}
                  </span>
                </div>

                {l.status === "active" && (
                  <div className="px-1">
                    <PromoteDialog listingId={l.id} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
