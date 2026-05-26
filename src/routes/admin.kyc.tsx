import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";

import { adminListKyc, adminReviewKyc } from "@/lib/kyc.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle2, XCircle, ExternalLink, ShieldCheck, BadgeCheck } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { AdminTableToolbar, toCsv, downloadCsv } from "@/components/admin/AdminTableToolbar";
import { EmptyState } from "@/components/admin/EmptyState";
import { BulkActionBar } from "@/components/admin/BulkActionBar";
import { RowSkeleton, ErrorFallback } from "@/components/admin/Skeletons";

export const Route = createFileRoute("/admin/kyc")({
  head: () => ({ meta: [{ title: "KYC review — Admin" }, { name: "robots", content: "noindex" }] }),
  component: AdminKycPage,
});

type Status = "pending" | "approved" | "rejected" | "all";

type Item = {
  id: string; user_id: string; full_name: string; doc_type: string; status: string;
  created_at: string; bonus_credited: boolean; review_note: string | null;
  doc_front_signed: string | null; doc_back_signed: string | null; selfie_signed: string | null;
  profile: { display_name?: string; avatar_url?: string } | null;
};

function AdminKycPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<Status>("pending");
  const [text, setText] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const list = useServerFn(adminListKyc);
  const review = useServerFn(adminReviewKyc);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["admin-kyc", status],
    queryFn: () => list({ data: { status } }),
  });

  const reviewMut = useMutation({
    mutationFn: async (v: { id: string; action: "approve" | "reject"; note?: string }) =>
      review({ data: { submissionId: v.id, action: v.action, note: v.note } }),
    onSuccess: () => { toast.success("Done"); qc.invalidateQueries({ queryKey: ["admin-kyc"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const bulkMut = useMutation({
    mutationFn: async (v: { ids: string[]; action: "approve" | "reject"; note?: string }) => {
      const results = await Promise.allSettled(
        v.ids.map((id) => review({ data: { submissionId: id, action: v.action, note: v.note } }))
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      return { total: v.ids.length, failed };
    },
    onSuccess: ({ total, failed }) => {
      if (failed) toast.warning(`${total - failed}/${total} updated, ${failed} failed`);
      else toast.success(`${total} updated`);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["admin-kyc"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const items = (data?.items ?? []) as Item[];
  const filtered = useMemo(() => {
    const needle = text.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((it) =>
      [it.full_name, it.user_id, it.profile?.display_name, it.doc_type]
        .filter(Boolean).some((v) => String(v).toLowerCase().includes(needle))
    );
  }, [items, text]);

  const pendingSelected = filtered.filter((it) => selected.has(it.id) && it.status === "pending").map((it) => it.id);

  const exportCsv = () => {
    const rows = filtered.map((it) => ({
      id: it.id, user_id: it.user_id, full_name: it.full_name, doc_type: it.doc_type,
      status: it.status, bonus_credited: it.bonus_credited, created_at: it.created_at,
      review_note: it.review_note ?? "",
    }));
    downloadCsv(`kyc-${status}-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows));
  };

  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allChecked = filtered.length > 0 && filtered.every((it) => selected.has(it.id));
  const toggleAll = () => setSelected((s) => {
    if (allChecked) { const n = new Set(s); filtered.forEach((it) => n.delete(it.id)); return n; }
    const n = new Set(s); filtered.forEach((it) => n.add(it.id)); return n;
  });

  return (
    <div>
      <div className="mb-4">
        <h1 className="font-display text-2xl font-bold text-white">KYC verification</h1>
        <p className="text-sm text-slate-400">Review identity submissions and credit $5 bonus on approval.</p>
      </div>

      <AdminTableToolbar
        q={text}
        onQ={setText}
        placeholder="Search name, user id, doc type…"
        filters={[{
          value: status, onChange: (v) => { setStatus(v as Status); setSelected(new Set()); }, label: "Status",
          options: [
            { value: "pending", label: "Pending" },
            { value: "approved", label: "Approved" },
            { value: "rejected", label: "Rejected" },
            { value: "all", label: "All" },
          ],
        }]}
        total={filtered.length}
        onExportCsv={exportCsv}
      />

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {!isLoading && filtered.length === 0 && (
        <EmptyState
          icon={status === "pending" ? ShieldCheck : BadgeCheck}
          title={text ? "No submissions match" : `No ${status === "all" ? "" : status + " "}submissions`}
          description={text ? "Try clearing the search." : "Identity submissions will appear here as users complete KYC."}
        />
      )}

      {filtered.length > 0 && (
        <label className="mb-3 ml-1 inline-flex cursor-pointer items-center gap-2 text-xs text-slate-400">
          <input type="checkbox" checked={allChecked} onChange={toggleAll} className="h-4 w-4" />
          Select all on page
        </label>
      )}

      <div className="space-y-4">
        {filtered.map((it) => (
          <Card key={it.id} className="rounded-2xl">
            <CardContent className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selected.has(it.id)}
                    onChange={() => toggle(it.id)}
                    className="h-4 w-4"
                    aria-label="Select submission"
                  />
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={it.profile?.avatar_url ?? undefined} />
                    <AvatarFallback>{(it.profile?.display_name ?? it.full_name).slice(0, 1).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold">{it.full_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {it.profile?.display_name ?? it.user_id.slice(0, 8)} · {format(new Date(it.created_at), "MMM d, HH:mm")}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">{it.doc_type.replace("_", " ")}</Badge>
                  <Badge variant={it.status === "approved" ? "default" : it.status === "rejected" ? "destructive" : "secondary"} className="capitalize">
                    {it.status}
                  </Badge>
                  {it.bonus_credited && <Badge className="bg-emerald-600">$5 paid</Badge>}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <DocPreview label="ID front" url={it.doc_front_signed} />
                <DocPreview label="ID back" url={it.doc_back_signed} />
                <DocPreview label="Selfie" url={it.selfie_signed} />
              </div>

              {it.review_note && (
                <p className="mt-3 rounded-lg border border-border/40 bg-muted/30 p-2 text-xs">
                  <span className="font-medium">Note:</span> {it.review_note}
                </p>
              )}

              {it.status === "pending" && (
                <div className="mt-4 space-y-2 border-t pt-4">
                  <Textarea
                    placeholder="Optional note (required if rejecting)"
                    value={notes[it.id] ?? ""}
                    onChange={(e) => setNotes((n) => ({ ...n, [it.id]: e.target.value }))}
                    rows={2}
                  />
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      variant="outline"
                      className="text-rose-600 hover:bg-rose-50"
                      disabled={reviewMut.isPending || !(notes[it.id]?.trim())}
                      onClick={() => reviewMut.mutate({ id: it.id, action: "reject", note: notes[it.id] })}
                    >
                      <XCircle className="mr-1 h-4 w-4" /> Reject
                    </Button>
                    <Button
                      disabled={reviewMut.isPending}
                      onClick={() => reviewMut.mutate({ id: it.id, action: "approve", note: notes[it.id] || undefined })}
                    >
                      <CheckCircle2 className="mr-1 h-4 w-4" /> Approve & pay $5
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <BulkActionBar
        count={selected.size}
        onClear={() => setSelected(new Set())}
        actions={[
          {
            label: `Approve ${pendingSelected.length} pending`,
            onClick: () => {
              if (!pendingSelected.length) { toast.error("No pending submissions selected"); return; }
              if (confirm(`Approve ${pendingSelected.length} submission(s) and credit $5 each?`))
                bulkMut.mutate({ ids: pendingSelected, action: "approve" });
            },
          },
          {
            label: `Reject ${pendingSelected.length} pending`,
            variant: "destructive",
            onClick: () => {
              if (!pendingSelected.length) { toast.error("No pending submissions selected"); return; }
              const note = prompt("Rejection note (required):", "")?.trim();
              if (!note) { toast.error("Note required"); return; }
              bulkMut.mutate({ ids: pendingSelected, action: "reject", note });
            },
          },
        ]}
      />
    </div>
  );
}

function DocPreview({ label, url }: { label: string; url: string | null }) {
  return (
    <div className="rounded-xl border border-border/40 bg-muted/20 p-2">
      <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        {url && <a href={url} target="_blank" rel="noopener" className="hover:text-primary"><ExternalLink className="h-3 w-3" /></a>}
      </div>
      {url ? (
        <a href={url} target="_blank" rel="noopener" className="block">
          <img src={url} alt={label} className="h-40 w-full rounded-md object-cover" />
        </a>
      ) : (
        <div className="grid h-40 w-full place-items-center rounded-md bg-muted/40 text-xs text-muted-foreground">Not provided</div>
      )}
    </div>
  );
}
