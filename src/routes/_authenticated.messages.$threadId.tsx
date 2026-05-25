import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, ChevronLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/messages/$threadId")({
  component: ThreadView,
});

function ThreadView() {
  const { threadId } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

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
        .from("listings").select("id, title").eq("id", data.listing_id).maybeSingle();
      const otherId = data.buyer_id === user?.id ? data.seller_id : data.buyer_id;
      const { data: other } = await supabase
        .from("profiles").select("id, display_name, avatar_url").eq("id", otherId).maybeSingle();
      return { ...data, listing, other };
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

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length]);

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
    },
    onSuccess: () => {
      setBody("");
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
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm ${mine ? "text-white" : "bg-white/70 backdrop-blur"}`}
                style={mine ? { background: "var(--gradient-primary)", backgroundSize: "200% 200%" } : undefined}
              >
                {m.body}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <form onSubmit={onSubmit} className="flex gap-2 border-t border-white/40 p-3">
        <Input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a message…" className="rounded-full bg-white/70 backdrop-blur" />
        <Button type="submit" disabled={send.isPending || !body.trim()} className="btn-gradient rounded-full border-0">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
