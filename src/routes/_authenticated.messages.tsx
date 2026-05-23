import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare } from "lucide-react";

export const Route = createFileRoute("/_authenticated/messages")({
  component: MessagesLayout,
});

function MessagesLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const { data: threads, refetch } = useQuery({
    queryKey: ["threads", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: t } = await supabase
        .from("message_threads")
        .select("id, buyer_id, seller_id, listing_id, last_message_at")
        .or(`buyer_id.eq.${user!.id},seller_id.eq.${user!.id}`)
        .order("last_message_at", { ascending: false });
      if (!t || t.length === 0) return [];
      const listingIds = [...new Set(t.map((x) => x.listing_id))];
      const otherIds = [...new Set(t.map((x) => (x.buyer_id === user!.id ? x.seller_id : x.buyer_id)))];
      const [{ data: listings }, { data: profiles }] = await Promise.all([
        supabase.from("listings").select("id, title").in("id", listingIds),
        supabase.from("profiles").select("id, display_name, avatar_url").in("id", otherIds),
      ]);
      return t.map((row) => ({
        ...row,
        listing: listings?.find((l) => l.id === row.listing_id),
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

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="mb-4 font-display text-2xl font-bold"><span className="gradient-text">Messages</span></h1>
      <div className="grid gap-4 md:grid-cols-[320px_1fr]">
        <aside className="rounded-2xl glass overflow-hidden">
          {threads && threads.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">
              <MessageSquare className="mx-auto mb-2 h-6 w-6" />
              No conversations yet.
            </div>
          )}
          <ul className="divide-y divide-white/40">
            {threads?.map((t) => (
              <li key={t.id}>
                <Link
                  to="/messages/$threadId"
                  params={{ threadId: t.id }}
                  className={`block p-3 transition hover:bg-white/40 ${activeId === t.id ? "bg-white/60" : ""}`}
                >
                  <div className="truncate text-sm font-medium">{t.other?.display_name ?? "User"}</div>
                  <div className="truncate text-xs text-muted-foreground">{t.listing?.title}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(t.last_message_at), { addSuffix: true })}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </aside>
        <section className="rounded-2xl glass min-h-[60vh]">
          <Outlet />
        </section>
      </div>
    </div>
  );
}
