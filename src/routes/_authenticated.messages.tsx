import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Search, MoreVertical, Archive, ArchiveRestore, Bell, BellOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import listingPlaceholder from "@/assets/listing-placeholder.jpg";

export const Route = createFileRoute("/_authenticated/messages")({
  head: () => ({ meta: [{ title: "Messages — CallEscort24" }, { name: "description", content: "Your conversations with buyers and sellers on CallEscort24." }] }),
  component: MessagesLayout,
});

type ThreadRow = {
  id: string; buyer_id: string; seller_id: string; listing_id: string; last_message_at: string;
  archived_by: string[] | null; muted_by: string[] | null;
  listing?: { id: string; title: string; listing_images?: { url: string; sort_order: number }[] } | null;
  other?: { id: string; display_name: string; avatar_url: string | null } | null;
  unread?: number;
};

function MessagesLayout() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const location = useLocation();
  const [filter, setFilter] = useState("");
  const [tab, setTab] = useState<"inbox" | "archived">("inbox");

  const { data: threads, refetch } = useQuery({
    queryKey: ["threads", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<ThreadRow[]> => {
      const { data: t } = await supabase
        .from("message_threads")
        .select("id, buyer_id, seller_id, listing_id, last_message_at, archived_by, muted_by")
        .or(`buyer_id.eq.${user!.id},seller_id.eq.${user!.id}`)
        .order("last_message_at", { ascending: false });
      if (!t || t.length === 0) return [];
      const listingIds = [...new Set(t.map((x) => x.listing_id))];
      const otherIds = [...new Set(t.map((x) => (x.buyer_id === user!.id ? x.seller_id : x.buyer_id)))];
      const threadIds = t.map(x => x.id);
      const [{ data: listings }, { data: profiles }, { data: reads }, { data: msgs }] = await Promise.all([
        supabase.from("listings").select("id, title, listing_images(url, sort_order)").in("id", listingIds),
        supabase.from("profiles").select("id, display_name, avatar_url").in("id", otherIds),
        supabase.from("thread_reads").select("thread_id, last_read_at").eq("user_id", user!.id).in("thread_id", threadIds),
        supabase.from("messages").select("thread_id, sender_id, created_at").in("thread_id", threadIds),
      ]);
      const readMap = new Map((reads ?? []).map(r => [r.thread_id, r.last_read_at]));
      const unreadMap = new Map<string, number>();
      (msgs ?? []).forEach(m => {
        if (m.sender_id === user!.id) return;
        const lr = readMap.get(m.thread_id);
        if (!lr || new Date(m.created_at) > new Date(lr)) {
          unreadMap.set(m.thread_id, (unreadMap.get(m.thread_id) ?? 0) + 1);
        }
      });
      return t.map((row) => ({
        ...row,
        listing: listings?.find((l) => l.id === row.listing_id) as ThreadRow["listing"],
        other: profiles?.find((p) => p.id === (row.buyer_id === user!.id ? row.seller_id : row.buyer_id)),
        unread: unreadMap.get(row.id) ?? 0,
      }));
    },
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("messages-overview")
      .on("postgres_changes", { event: "*", schema: "public", table: "message_threads" }, () => refetch())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => refetch())
      .on("postgres_changes", { event: "*", schema: "public", table: "thread_reads", filter: `user_id=eq.${user.id}` }, () => refetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, refetch]);

  const activeId = location.pathname.split("/messages/")[1];
  const hasActive = !!activeId;

  const toggleArchive = async (t: ThreadRow) => {
    if (!user) return;
    const arr = new Set(t.archived_by ?? []);
    arr.has(user.id) ? arr.delete(user.id) : arr.add(user.id);
    const { error } = await supabase.from("message_threads").update({ archived_by: Array.from(arr) }).eq("id", t.id);
    if (error) return toast.error(error.message);
    toast.success(arr.has(user.id) ? "Archived" : "Restored to inbox");
    qc.invalidateQueries({ queryKey: ["threads"] });
  };

  const toggleMute = async (t: ThreadRow) => {
    if (!user) return;
    const arr = new Set(t.muted_by ?? []);
    arr.has(user.id) ? arr.delete(user.id) : arr.add(user.id);
    const { error } = await supabase.from("message_threads").update({ muted_by: Array.from(arr) }).eq("id", t.id);
    if (error) return toast.error(error.message);
    toast.success(arr.has(user.id) ? "Muted" : "Unmuted");
    qc.invalidateQueries({ queryKey: ["threads"] });
  };

  const inboxThreads = (threads ?? []).filter(t => !(t.archived_by ?? []).includes(user?.id ?? ""));
  const archivedThreads = (threads ?? []).filter(t => (t.archived_by ?? []).includes(user?.id ?? ""));
  const list = tab === "inbox" ? inboxThreads : archivedThreads;

  const filtered = list.filter(t => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (t.other?.display_name ?? "").toLowerCase().includes(q)
      || (t.listing?.title ?? "").toLowerCase().includes(q);
  });

  const totalUnread = inboxThreads.reduce((n, t) => n + (t.unread ?? 0), 0);

  return (
    <div className="container mx-auto px-3 py-4 sm:px-4 sm:py-6">
      <h1 className="mb-4 flex items-center gap-2 font-display text-2xl font-bold">
        <span className="gradient-text">Messages</span>
        {totalUnread > 0 && (
          <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
            {totalUnread} new
          </span>
        )}
      </h1>
      <div className="grid gap-4 md:grid-cols-[340px_1fr]">
        <aside className={`overflow-hidden rounded-2xl glass ${hasActive ? "hidden md:block" : "block"}`}>
          <div className="flex gap-1 border-b border-white/40 p-2">
            {(["inbox", "archived"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 rounded-full px-3 py-1.5 text-xs font-medium capitalize transition ${
                  tab === t ? "bg-primary text-primary-foreground" : "bg-white/40 text-muted-foreground hover:bg-white/70"
                }`}
              >
                {t} {t === "inbox" && totalUnread > 0 && <span className="ml-1">({totalUnread})</span>}
                {t === "archived" && archivedThreads.length > 0 && <span className="ml-1">({archivedThreads.length})</span>}
              </button>
            ))}
          </div>
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
              const unread = (t.unread ?? 0) > 0;
              const isActive = activeId === t.id;
              const muted = (t.muted_by ?? []).includes(user?.id ?? "");
              const archived = (t.archived_by ?? []).includes(user?.id ?? "");
              return (
                <li key={t.id} className="group relative">
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
                    <div className="min-w-0 flex-1 pr-8">
                      <div className="flex items-center gap-2">
                        <div className={`min-w-0 flex-1 truncate text-sm ${unread && !isActive ? "font-bold" : "font-medium"}`}>
                          {t.other?.display_name ?? "User"}
                        </div>
                        {muted && <BellOff className="h-3 w-3 shrink-0 text-muted-foreground" />}
                        {unread && !isActive && (
                          <span className="shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                            {t.unread}
                          </span>
                        )}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">{t.listing?.title}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(t.last_message_at), { addSuffix: true })}
                      </div>
                    </div>
                  </Link>
                  <div className="absolute right-2 top-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                          className="grid h-7 w-7 place-items-center rounded-full bg-white/70 opacity-0 backdrop-blur transition group-hover:opacity-100 hover:bg-white"
                          aria-label="Thread actions"
                        >
                          <MoreVertical className="h-3.5 w-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl">
                        <DropdownMenuItem onClick={() => toggleMute(t)}>
                          {muted ? <Bell className="mr-2 h-4 w-4" /> : <BellOff className="mr-2 h-4 w-4" />}
                          {muted ? "Unmute" : "Mute"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleArchive(t)}>
                          {archived ? <ArchiveRestore className="mr-2 h-4 w-4" /> : <Archive className="mr-2 h-4 w-4" />}
                          {archived ? "Restore to inbox" : "Archive"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
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
