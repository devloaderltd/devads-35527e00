import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, ChevronLeft, Sparkles, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { listQuickReplies } from "@/lib/social.functions";
import { notifyNewMessage } from "@/lib/email/notify.functions";
import { TypingBubble } from "@/components/messages/TypingBubble";
import { MessageTicks } from "@/components/messages/MessageTicks";
import type { RealtimeChannel } from "@supabase/supabase-js";

export const Route = createFileRoute("/_authenticated/messages/$threadId")({
  component: ThreadView,
});

function ThreadView() {
  const { threadId } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const [typing, setTyping] = useState(false);
  const [otherLastRead, setOtherLastRead] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<number | null>(null);
  const presenceRef = useRef<RealtimeChannel | null>(null);

  const { data: thread } = useQuery({
    queryKey: ["thread", threadId],
    queryFn: async () => {
      const { data } = await supabase
        .from("message_threads")
        .select("id, buyer_id, seller_id, listing_id")
        .eq("id", threadId)
        .maybeSingle();
      if (!data) return null;
      const { data: listing } = await supabase
        .from("listings").select("id, title, status").eq("id", data.listing_id).maybeSingle();
      const otherId = data.buyer_id === user?.id ? data.seller_id : data.buyer_id;
      const { data: other } = await supabase
        .from("profiles").select("id, display_name, avatar_url, show_read_receipts").eq("id", otherId).maybeSingle();
      return { ...data, listing, other, otherId };
    },
  });

  const { data: messages } = useQuery({
    queryKey: ["messages", threadId],
    queryFn: async () => {
      const { data } = await supabase
        .from("messages")
        .select("id, body, sender_id, created_at")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  // Realtime new messages
  useEffect(() => {
    const ch = supabase
      .channel(`messages-${threadId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `thread_id=eq.${threadId}` },
        () => qc.invalidateQueries({ queryKey: ["messages", threadId] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [threadId, qc]);

  // Server-backed read state: upsert when opening / on new messages
  useEffect(() => {
    if (!user || !messages?.length) return;
    supabase.from("thread_reads").upsert(
      { thread_id: threadId, user_id: user.id, last_read_at: new Date().toISOString() },
      { onConflict: "thread_id,user_id" }
    ).then(() => qc.invalidateQueries({ queryKey: ["threads"] }));
  }, [messages?.length, threadId, user, qc]);

  // Watch other party's read state
  useEffect(() => {
    if (!thread?.otherId) return;
    const fetchOther = async () => {
      const { data } = await supabase
        .from("thread_reads")
        .select("last_read_at")
        .eq("thread_id", threadId)
        .eq("user_id", thread.otherId)
        .maybeSingle();
      setOtherLastRead(data?.last_read_at ?? null);
    };
    fetchOther();
    const ch = supabase
      .channel(`reads-${threadId}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "thread_reads",
        filter: `thread_id=eq.${threadId}`,
      }, fetchOther)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [threadId, thread?.otherId]);

  // Presence-based typing indicator (single channel ref reused for track())
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`presence-${threadId}`, { config: { presence: { key: user.id } } });
    presenceRef.current = ch;
    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState() as Record<string, Array<{ typing?: boolean }>>;
      const others = Object.entries(state).filter(([k]) => k !== user.id);
      setTyping(others.some(([, v]) => v.some(p => p.typing)));
    });
    ch.subscribe(async (status) => {
      if (status === "SUBSCRIBED") await ch.track({ typing: false });
    });
    return () => {
      supabase.removeChannel(ch);
      presenceRef.current = null;
    };
  }, [threadId, user]);

  const broadcastTyping = (isTyping: boolean) => {
    presenceRef.current?.track({ typing: isTyping });
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length]);

  const listQrFn = useServerFn(listQuickReplies);
  const { data: customQr } = useQuery({
    queryKey: ["quick-replies"],
    enabled: !!user,
    queryFn: () => listQrFn(),
    staleTime: 60_000,
  });

  const QUICK_REPLIES = useMemo(() => {
    type QR = { label: string; body: string; custom: boolean };
    if (!thread) return [] as QR[];
    const isSeller = thread.seller_id === user?.id;
    const sold = thread.listing?.status === "sold";
    const defaults: string[] = sold
      ? ["Sorry, this one is sold.", "I'll let you know if I have another.", "Thanks for the interest!"]
      : isSeller
      ? ["Yes, it's still available.", "Best price I can do.", "When can you pick it up?", "Want to see more photos?"]
      : ["Is it still available?", "Can you do a better price?", "When can I pick it up?", "Where are you located?"];
    const custom: QR[] = (customQr?.items ?? []).map((it) => ({ label: it.label, body: it.body, custom: true }));
    const def: QR[] = defaults.map((d) => ({ label: d, body: d, custom: false }));
    return [...custom, ...def];
  }, [thread, user?.id, customQr]);

  const send = useMutation({
    mutationFn: async (text: string) => {
      const { error } = await supabase.from("messages").insert({
        thread_id: threadId,
        sender_id: user!.id,
        body: text,
      });
      if (error) throw error;
      await supabase
        .from("message_threads")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", threadId);
      // Fire-and-forget email notification to the other party.
      // Failures are swallowed so the send UX is never blocked by email infra.
      notifyNewMessage({ data: { threadId, preview: text } }).catch(() => {});
    },
    onSuccess: () => {
      setBody("");
      broadcastTyping(false);
      qc.invalidateQueries({ queryKey: ["messages", threadId] });
      qc.invalidateQueries({ queryKey: ["threads"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    send.mutate(text);
  };

  const onBodyChange = (v: string) => {
    setBody(v);
    broadcastTyping(true);
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => broadcastTyping(false), 2000);
  };

  const showReceipts = thread?.other?.show_read_receipts !== false;
  const otherReadAt = otherLastRead ? new Date(otherLastRead) : null;

  return (
    <div className="flex h-[70vh] flex-col">
      <div className="flex items-center gap-2 border-b border-white/40 p-3">
        <Link
          to="/messages"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/60 backdrop-blur hover:bg-white md:hidden"
          aria-label="Back to conversations"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1 text-sm">
          <div className="text-xs text-muted-foreground">Listing</div>
          {thread?.listing ? (
            <Link to="/listings/$id" params={{ id: thread.listing.id }} className="block truncate font-medium hover:text-primary">
              {thread.listing.title}
            </Link>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
        {thread?.other && (
          <Link
            to="/sellers/$id"
            params={{ id: thread.other.id }}
            className="flex shrink-0 items-center gap-2 rounded-full bg-white/60 px-2 py-1 text-sm backdrop-blur hover:bg-white"
          >
            {thread.other.avatar_url ? (
              <img src={thread.other.avatar_url} alt="" className="h-6 w-6 rounded-full object-cover" />
            ) : (
              <div
                className="grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold text-white"
                style={{ background: "var(--gradient-primary)" }}
              >
                {(thread.other.display_name || "?").slice(0, 1).toUpperCase()}
              </div>
            )}
            <span className="hidden max-w-[10rem] truncate sm:inline">{thread.other.display_name}</span>
          </Link>
        )}
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {messages?.map((m) => {
          const mine = m.sender_id === user?.id;
          const tickState: "sent" | "delivered" | "seen" =
            !mine ? "sent"
            : !showReceipts ? "delivered"
            : otherReadAt && otherReadAt >= new Date(m.created_at) ? "seen"
            : otherReadAt ? "delivered"
            : "sent";
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm ${mine ? "text-white" : "bg-white/70 backdrop-blur"}`}
                style={mine ? { background: "var(--gradient-primary)", backgroundSize: "200% 200%" } : undefined}
              >
                <div>{m.body}</div>
                {mine && (
                  <div className="mt-0.5 flex items-center justify-end gap-1 text-[10px] opacity-90">
                    <span>{new Date(m.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                    <MessageTicks state={tickState} seenAt={tickState === "seen" ? otherLastRead : null} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {typing && <TypingBubble name={thread?.other?.display_name} />}
        <div ref={endRef} />
      </div>
      <div className="border-t border-white/40 p-3">
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          {QUICK_REPLIES.map((q, i) => (
            <button
              key={`${q.label}-${i}`}
              onClick={() => {
                if (send.isPending) return;
                send.mutate(q.body);
              }}
              type="button"
              disabled={send.isPending}
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs backdrop-blur transition hover:bg-white hover:text-foreground disabled:opacity-50 ${
                q.custom
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-white/50 bg-white/60 text-muted-foreground"
              }`}
              title={`Send: ${q.body}`}
            >
              {q.custom && <Sparkles className="h-3 w-3" />}
              {q.label}
            </button>
          ))}
          <Link
            to="/profile"
            hash="quick-replies"
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-muted-foreground/40 px-3 py-1 text-xs text-muted-foreground transition hover:bg-white hover:text-foreground"
            title="Manage templates"
          >
            <Settings2 className="h-3 w-3" />
            Templates
          </Link>
        </div>
        <form onSubmit={onSubmit} className="flex gap-2">
          <Input value={body} onChange={(e) => onBodyChange(e.target.value)} placeholder="Write a message…" className="rounded-full bg-white/70 backdrop-blur" />
          <Button type="submit" disabled={send.isPending || !body.trim()} className="btn-gradient rounded-full border-0">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
