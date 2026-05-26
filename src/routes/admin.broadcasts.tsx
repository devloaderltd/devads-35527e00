import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { AdminPageHeader, Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Bell, Megaphone } from "lucide-react";
import { adminBroadcastNotification, listBroadcasts } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/broadcasts")({ component: BroadcastsPage });

type Bcast = { id: string; created_at: string; audience: string; title: string; body: string | null; link: string | null; recipient_count: number };

function BroadcastsPage() {
  const send = useServerFn(adminBroadcastNotification);
  const list = useServerFn(listBroadcasts);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-broadcasts"], queryFn: () => list() });

  const [audience, setAudience] = useState<"all" | "role:user" | "role:moderator" | "role:admin" | "user">("all");
  const [userId, setUserId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");

  const sendMut = useMutation({
    mutationFn: async () => {
      const aud = audience === "user" ? (`user:${userId}` as const) : audience;
      return send({ data: { audience: aud, title, body: body || null, link: link || null } });
    },
    onSuccess: (res) => {
      toast.success(`Sent to ${res.sent} user(s)`);
      setTitle(""); setBody(""); setLink("");
      qc.invalidateQueries({ queryKey: ["admin-broadcasts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <AdminPageHeader title="Broadcasts" subtitle="Send in-app notifications to users" />
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Panel title="New broadcast" actions={<Megaphone className="h-4 w-4 text-slate-400" />}>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-slate-400">Audience</Label>
              <select className="mt-1 w-full rounded-md border border-white/10 bg-slate-900/50 px-3 py-2 text-sm text-slate-100" value={audience} onChange={(e) => setAudience(e.target.value as typeof audience)}>
                <option value="all">All users</option>
                <option value="role:user">Role: User</option>
                <option value="role:moderator">Role: Moderator</option>
                <option value="role:admin">Role: Admin</option>
                <option value="user">Specific user (UUID)</option>
              </select>
            </div>
            {audience === "user" && (
              <div>
                <Label className="text-xs text-slate-400">User ID</Label>
                <Input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="00000000-0000-…" className="bg-slate-900/50" />
              </div>
            )}
            <div>
              <Label className="text-xs text-slate-400">Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} className="bg-slate-900/50" />
            </div>
            <div>
              <Label className="text-xs text-slate-400">Body</Label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={1000} rows={3} className="bg-slate-900/50" />
            </div>
            <div>
              <Label className="text-xs text-slate-400">Link (optional)</Label>
              <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="/listings/123" className="bg-slate-900/50" />
            </div>
            <Button className="w-full rounded-full border-0 bg-gradient-to-r from-indigo-500 to-fuchsia-500"
              disabled={!title || sendMut.isPending || (audience === "user" && !userId)}
              onClick={() => { if (confirm("Send this broadcast?")) sendMut.mutate(); }}>
              {sendMut.isPending ? "Sending…" : "Send broadcast"}
            </Button>
          </div>
        </Panel>
        <Panel title="Recent broadcasts">
          <div className="space-y-2">
            {(q.data?.broadcasts ?? []).map((b: Bcast) => (
              <div key={b.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium text-slate-100">{b.title}</div>
                  <Badge variant="secondary" className="text-xs">{b.audience}</Badge>
                </div>
                {b.body && <div className="mt-1 line-clamp-2 text-sm text-slate-400">{b.body}</div>}
                <div className="mt-1 text-xs text-slate-500">
                  {b.recipient_count} recipient(s) · {formatDistanceToNow(new Date(b.created_at), { addSuffix: true })}
                </div>
              </div>
            ))}
            {!q.data?.broadcasts.length && <div className="py-8 text-center text-sm text-slate-400">No broadcasts yet.</div>}
          </div>
        </Panel>
      </div>
    </div>
  );
}
