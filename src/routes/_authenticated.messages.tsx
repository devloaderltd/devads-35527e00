import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import listingPlaceholder from "@/assets/listing-placeholder.jpg";

export const Route = createFileRoute("/_authenticated/messages")({
  head: () => ({ meta: [{ title: "Messages — CallEscort24" }, { name: "description", content: "Your conversations with buyers and sellers on CallEscort24." }] }),
  component: MessagesLayout,
});

type ThreadRow = {
  id: string; buyer_id: string; seller_id: string; listing_id: string; last_message_at: string;
  listing?: { id: string; title: string; listing_images?: { url: string; sort_order: number }[] } | null;
  other?: { id: string; display_name: string; avatar_url: string | null } | null;
};

function readLastReadMap(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem("thread_last_read") || "{}"); }
  catch { return {}; }
}

function MessagesLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const [filter, setFilter] = useState("");
  const { data: threads, refetch } = useQuery({
    queryKey: ["threads", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<ThreadRow[]> => {
      const { data: t } = await supabase
        .from("message_threads")
        .select("id, buyer_id, seller_id, listing_id, last_message_at")
        .or(`buyer_id.eq.${user!.id},seller_id.eq.${user!.id}`)
        .order("last_message_at", { ascending: false });
      if (!t || t.length === 0) return [];
      const listingIds = [...new Set(t.map((x) => x.listing_id))];
      const otherIds = [...new Set(t.map((x) => (x.buyer_id === user!.id ? x.seller_id : x.buyer_id)))];
      const [{ data: listings }, { data: profiles }] = await Promise.all([
        supabase.from("listings").select("id, title, listing_images(url, sort_order)").in("id", listingIds),
        supabase.from("profiles").select("id, display_name, avatar_url").in("id", otherIds),
      ]);
      return t.map((row) => ({
        ...row,
        listing: listings?.find((l) => l.id === row.listing_id) as ThreadRow["listing"],
        other: profiles?.find((p) => p.id === (row.buyer_id === user!.id ? row.seller_id : row.buyer_id)),
      }));
    },
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("thread-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "message_threads" }, () => refetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, refetch]);

  const activeId = location.pathname.split("/messages/")[1];
  const hasActive = !!activeId;
  const lastRead = readLastReadMap();

  const filtered = (threads ?? []).filter(t => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (t.other?.display_name ?? "").toLowerCase().includes(q)
      || (t.listing?.title ?? "").toLowerCase().includes(q);
  });

  return (
    <div className="container mx-auto px-3 py-4 sm:px-4 sm:py-6">
      <h1 className="mb-4 font-display text-2xl font-bold"><span className="gradient-text">Messages</span></h1>
      <div className="grid gap-4 md:grid-cols-[340px_1fr]">
        <aside className={`overflow-hidden rounded-2xl glass ${hasActive ? "hidden md:block" : "block"}`}>
          <div className="border-b border-white/40 p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search conversations…"
                className="h-9 rounded-full bg-white/70 pl-8 text-sm backdrop-blur"
              />
            </div>
          </div>
          {filtered.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">
              <MessageSquare className="mx-auto mb-2 h-6 w-6" />
              {threads?.length ? "No matches." : "No conversations yet."}
            </div>
          )}
          <ul className="divide-y divide-white/40">
            {filtered.map((t) => {
              const img = t.listing?.listing_images?.sort((a, b) => a.sort_order - b.sort_order)[0]?.url;
              const lastReadAt = lastRead[t.id];
              const unread = !lastReadAt || new Date(t.last_message_at) > new Date(lastReadAt);
              const isActive = activeId === t.id;
              return (
                <li key={t.id}>
                  <Link
                    to="/messages/$threadId"
                    params={{ threadId: t.id }}
                    className={`flex gap-3 p-3 transition hover:bg-white/40 ${isActive ? "bg-white/60" : ""}`}
                  >
                    <img
                      src={img ?? listingPlaceholder}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded-xl object-cover ring-1 ring-white/50"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className={`min-w-0 flex-1 truncate text-sm ${unread && !isActive ? "font-bold" : "font-medium"}`}>
                          {t.other?.display_name ?? "User"}
                        </div>
                        {unread && !isActive && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">{t.listing?.title}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(t.last_message_at), { addSuffix: true })}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </aside>
        <section className={`min-h-[60vh] rounded-2xl glass ${hasActive ? "block" : "hidden md:block"}`}>
          <Outlet />
        </section>
      </div>
    </div>
  );
}
