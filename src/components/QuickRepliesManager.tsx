import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { listQuickReplies, createQuickReply, deleteQuickReply } from "@/lib/social.functions";

export function QuickRepliesManager() {
  const qc = useQueryClient();
  const listFn = useServerFn(listQuickReplies);
  const createFn = useServerFn(createQuickReply);
  const deleteFn = useServerFn(deleteQuickReply);
  const [label, setLabel] = useState("");
  const [body, setBody] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["quick-replies"],
    queryFn: () => listFn(),
  });

  const create = useMutation({
    mutationFn: () => createFn({ data: { label: label.trim(), body: body.trim() } }),
    onSuccess: () => {
      setLabel("");
      setBody("");
      toast.success("Quick reply added");
      qc.invalidateQueries({ queryKey: ["quick-replies"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Removed");
      qc.invalidateQueries({ queryKey: ["quick-replies"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const items = data?.items ?? [];

  return (
    <Card className="glass border-white/40">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-4 w-4 text-primary" />
          Quick replies
          <Badge variant="secondary" className="ml-auto rounded-full bg-white/60">
            {items.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Save canned responses you can drop into any conversation with a tap.
        </p>

        <div className="space-y-2">
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : !items.length ? (
            <div className="rounded-xl border border-dashed border-white/50 bg-white/40 p-4 text-center text-xs text-muted-foreground">
              No quick replies yet. Add one below.
            </div>
          ) : (
            items.map((it) => (
              <div
                key={it.id}
                className="flex items-start gap-2 rounded-xl border border-white/50 bg-white/60 p-3 backdrop-blur"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{it.label}</div>
                  <div className="line-clamp-2 text-xs text-muted-foreground">{it.body}</div>
                </div>
                <button
                  type="button"
                  onClick={() => remove.mutate(it.id)}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-red-50 hover:text-red-600"
                  aria-label="Delete quick reply"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="space-y-2 rounded-xl border border-white/50 bg-white/40 p-3">
          <Input
            placeholder="Label (e.g. Still available)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={80}
            className="bg-white/70"
          />
          <Textarea
            placeholder="Message body…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={2000}
            rows={2}
            className="bg-white/70"
          />
          <Button
            type="button"
            onClick={() => create.mutate()}
            disabled={create.isPending || !label.trim() || !body.trim()}
            className="btn-gradient w-full rounded-full border-0"
          >
            <Plus className="mr-1 h-4 w-4" /> Add quick reply
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
