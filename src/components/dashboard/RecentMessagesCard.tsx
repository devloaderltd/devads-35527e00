import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function RecentMessagesCard({ userId }: { userId: string | undefined }) {
  const { data: items } = useQuery({
    queryKey: ["dashboard-threads", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data: threads } = await supabase
        .from("message_threads")
        .select("id, buyer_id, seller_id, last_message_at, listing_id")
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
        .order("last_message_at", { ascending: false })
        .limit(5);
      if (!threads?.length) return [];

      const peerIds = threads.map((t) => (t.buyer_id === userId ? t.seller_id : t.buyer_id));
      const listingIds = threads.map((t) => t.listing_id);
      const [{ data: profiles }, { data: listings }, { data: lastMsgs }] = await Promise.all([
        supabase.from("profiles").select("id, display_name, avatar_url").in("id", peerIds),
        supabase.from("listings").select("id, title").in("id", listingIds),
        supabase
          .from("messages")
          .select("thread_id, body, created_at")
          .in("thread_id", threads.map((t) => t.id))
          .order("created_at", { ascending: false }),
      ]);

      const profMap = new Map((profiles ?? []).map((p) => [p.id, p]));
      const lstMap = new Map((listings ?? []).map((l) => [l.id, l]));
      const msgMap = new Map<string, { body: string; created_at: string }>();
      (lastMsgs ?? []).forEach((m) => {
        if (!msgMap.has(m.thread_id)) msgMap.set(m.thread_id, { body: m.body, created_at: m.created_at });
      });

      return threads.map((t) => {
        const peerId = t.buyer_id === userId ? t.seller_id : t.buyer_id;
        return {
          id: t.id,
          peer: profMap.get(peerId),
          listing: lstMap.get(t.listing_id),
          lastMessage: msgMap.get(t.id),
          last_message_at: t.last_message_at,
        };
      });
    },
  });

  return (
    <Card className="rounded-2xl border-0 bg-white/70 backdrop-blur dark:bg-white/5">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-4 w-4 text-primary" /> Recent conversations
        </CardTitle>
        <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
          <Link to="/messages">Open inbox</Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {(items?.length ?? 0) === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">No conversations yet.</p>
        )}
        {items?.map((t) => (
          <Link
            key={t.id}
            to="/messages/$threadId"
            params={{ threadId: t.id }}
            className="flex items-start gap-3 rounded-xl border border-border/40 p-2.5 transition hover:bg-white/60 dark:hover:bg-white/5"
          >
            <Avatar className="h-9 w-9">
              <AvatarImage src={t.peer?.avatar_url ?? undefined} />
              <AvatarFallback>{(t.peer?.display_name ?? "?").slice(0, 1).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium">{t.peer?.display_name ?? "User"}</span>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(t.last_message_at), { addSuffix: true })}
                </span>
              </div>
              {t.listing?.title && <p className="truncate text-[11px] text-muted-foreground">re: {t.listing.title}</p>}
              {t.lastMessage?.body && <p className="line-clamp-1 text-xs text-foreground/80">{t.lastMessage.body}</p>}
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
