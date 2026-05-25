import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { AdminPageHeader, Panel } from "@/components/admin/ui";
import { getModerationQueue, moderateReport } from "@/lib/extras.functions";

export const Route = createFileRoute("/admin/moderation")({ component: ModerationPage });

function ModerationPage() {
  const qc = useQueryClient();
  const getFn = useServerFn(getModerationQueue);
  const actFn = useServerFn(moderateReport);
  const q = useQuery({ queryKey: ["mod-queue"], queryFn: () => getFn() });
  const [notes, setNotes] = useState<Record<string, string>>({});
  const act = useMutation({
    mutationFn: (v: { reportId: string; action: "approve" | "dismiss" | "remove_listing"; note?: string }) => actFn({ data: v }),
    onSuccess: () => { toast.success("Done"); qc.invalidateQueries({ queryKey: ["mod-queue"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const reports = q.data?.reports ?? [];

  return (
    <div>
      <AdminPageHeader title="Moderation queue" subtitle={`${reports.length} open report${reports.length === 1 ? "" : "s"}`} />
      <div className="space-y-3">
        {reports.map((r) => (
          <Panel key={r.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{r.reason}</Badge>
                  <span className="text-xs text-slate-400">by {r.reporter?.display_name ?? "—"} · {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</span>
                </div>
                {r.listing
                  ? <a href={`/listings/${r.listing.id}`} target="_blank" rel="noopener noreferrer" className="mt-2 block text-sm text-indigo-300 hover:underline">{r.listing.title}</a>
                  : <span className="mt-2 block text-sm text-slate-400">Listing deleted</span>}
                {r.details && <p className="mt-1 text-sm text-slate-400">{r.details}</p>}
              </div>
            </div>
            <Textarea
              value={notes[r.id] ?? ""} onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
              placeholder="Optional note to the listing owner" rows={2} maxLength={500}
              className="mt-3 rounded-lg border-white/10 bg-white/5 text-slate-100"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className="rounded-full border-white/20 bg-white/5 text-slate-100" onClick={() => act.mutate({ reportId: r.id, action: "dismiss", note: notes[r.id] })}>Dismiss</Button>
              <Button size="sm" variant="outline" className="rounded-full border-emerald-500/40 bg-emerald-500/10 text-emerald-200" onClick={() => act.mutate({ reportId: r.id, action: "approve", note: notes[r.id] })}>Mark resolved</Button>
              {r.listing && r.listing.status !== "removed" && (
                <Button size="sm" variant="destructive" className="rounded-full" onClick={() => act.mutate({ reportId: r.id, action: "remove_listing", note: notes[r.id] })}>Remove listing & notify</Button>
              )}
            </div>
          </Panel>
        ))}
        {!reports.length && <Panel><div className="py-10 text-center text-sm text-slate-400">Queue is clear.</div></Panel>}
      </div>
    </div>
  );
}
