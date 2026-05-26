import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { adminListKyc, adminReviewKyc } from "@/lib/kyc.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle2, XCircle, ExternalLink, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/admin/kyc")({
  head: () => ({ meta: [{ title: "KYC review — Admin" }, { name: "robots", content: "noindex" }] }),
  component: AdminKycPage,
});

type Status = "pending" | "approved" | "rejected" | "all";

function AdminKycPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<Status>("pending");
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

  const items = (data?.items ?? []) as Array<{
    id: string; user_id: string; full_name: string; doc_type: string; status: string;
    created_at: string; bonus_credited: boolean; review_note: string | null;
    doc_front_signed: string | null; doc_back_signed: string | null; selfie_signed: string | null;
    profile: { display_name?: string; avatar_url?: string } | null;
  }>;

  return (
    <AdminShell>
      <div className="mb-4">
        <h1 className="font-display text-2xl font-bold text-white">KYC verification</h1>
        <p className="text-sm text-slate-400">Review identity submissions and credit $5 bonus on approval.</p>
      </div>

      <Tabs value={status} onValueChange={(v) => setStatus(v as Status)} className="mb-4">
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!isLoading && items.length === 0 && (
        <Card className="rounded-2xl"><CardContent className="p-10 text-center text-muted-foreground">
          <ShieldCheck className="mx-auto mb-2 h-8 w-8 opacity-40" />
          No {status} submissions.
        </CardContent></Card>
      )}

      <div className="space-y-4">
        {items.map((it) => (
          <Card key={it.id} className="rounded-2xl">
            <CardContent className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
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
    </AdminShell>
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
