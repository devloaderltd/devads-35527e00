import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, formatDistanceToNow } from "date-fns";
import { ChevronLeft, ChevronRight, AlertTriangle, CheckCircle2, Wallet, RefreshCcw, XCircle } from "lucide-react";
import { AdminPageHeader, Panel } from "@/components/admin/ui";
import { RowSkeleton, ErrorFallback } from "@/components/admin/Skeletons";
import { getBumpAuditLog } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/bump-audit")({ component: BumpAuditPage });

const OUTCOMES = [
  { key: "all", label: "All" },
  { key: "paid", label: "Paid" },
  { key: "unauthorized", label: "Unauthorized" },
  { key: "insufficient_funds", label: "Insufficient funds" },
  { key: "reconciled", label: "Reconciled" },
  { key: "error", label: "Error" },
] as const;

type Entry = {
  id: string;
  outcome: string;
  user_id: string | null;
  listing_id: string | null;
  wallet_transaction_id: string | null;
  payment_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
  user_name: string | null;
  listing_title: string | null;
  listing_slug: string | null;
};

function outcomeStyle(o: string) {
  switch (o) {
    case "paid": return { icon: <CheckCircle2 className="h-3.5 w-3.5" />, tone: "bg-emerald-500/15 text-emerald-700 border-emerald-300/60" };
    case "unauthorized": return { icon: <AlertTriangle className="h-3.5 w-3.5" />, tone: "bg-red-500/15 text-red-700 border-red-300/60" };
    case "insufficient_funds": return { icon: <Wallet className="h-3.5 w-3.5" />, tone: "bg-amber-500/15 text-amber-700 border-amber-300/60" };
    case "reconciled": return { icon: <RefreshCcw className="h-3.5 w-3.5" />, tone: "bg-indigo-500/15 text-indigo-700 border-indigo-300/60" };
    default: return { icon: <XCircle className="h-3.5 w-3.5" />, tone: "bg-slate-500/15 text-slate-700 border-slate-300/60" };
  }
}

function BumpAuditPage() {
  const fn = useServerFn(getBumpAuditLog);
  const [outcome, setOutcome] = useState<string>("all");
  const [page, setPage] = useState(1);
  const perPage = 50;

  const { data, isLoading, isError, isFetching, error, refetch } = useQuery({
    queryKey: ["bump-audit", outcome, page],
    queryFn: () => fn({ data: { outcome, page, perPage } }),
  });

  const entries = (data?.entries ?? []) as Entry[];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div>
      <AdminPageHeader
        title="Bump audit"
        subtitle={`${total.toLocaleString()} entries · page ${page} of ${totalPages}`}
      />

      <Panel className="mb-3">
        <div className="flex flex-wrap items-center gap-2">
          {OUTCOMES.map((o) => (
            <Button
              key={o.key}
              size="sm"
              variant={outcome === o.key ? "default" : "outline"}
              className="rounded-full"
              onClick={() => { setOutcome(o.key); setPage(1); }}
            >
              {o.label}
            </Button>
          ))}
        </div>
      </Panel>

      <Panel>
        {isLoading && <RowSkeleton rows={8} />}
        {isError && !isLoading && (
          <ErrorFallback
            title="Bump audit failed to load"
            message={(error as Error | undefined)?.message}
            onRetry={() => refetch()}
            isRetrying={isFetching}
          />
        )}
        {!isLoading && !isError && (
          <div className="space-y-2">
            {entries.map((e) => <Row key={e.id} entry={e} />)}
            {!entries.length && (
              <div className="py-10 text-center text-sm text-slate-400">No entries match.</div>
            )}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <div className="text-xs text-slate-500">{total.toLocaleString()} total</div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded-full"><ChevronLeft className="h-4 w-4" /> Prev</Button>
            <span className="text-xs text-slate-400">Page {page} / {totalPages}</span>
            <Button size="sm" variant="outline" disabled={!data?.hasMore} onClick={() => setPage((p) => p + 1)} className="rounded-full">Next <ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function Row({ entry }: { entry: Entry }) {
  const [open, setOpen] = useState(false);
  const style = outcomeStyle(entry.outcome);
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
      <div className="flex flex-wrap items-start gap-2">
        <Badge variant="outline" className={`shrink-0 gap-1 rounded-full border ${style.tone}`}>
          {style.icon} {entry.outcome}
        </Badge>
        <div className="min-w-0 flex-1">
          <div className="text-slate-100">
            {entry.listing_slug ? (
              <Link to="/listings/$id" params={{ id: entry.listing_slug }} className="font-medium hover:underline">
                {entry.listing_title ?? entry.listing_id?.slice(0, 8) ?? "(unknown listing)"}
              </Link>
            ) : (
              <span className="text-slate-400">(no listing)</span>
            )}
            {" · "}
            <span className="text-slate-300">{entry.user_name ?? entry.user_id?.slice(0, 8) ?? "system"}</span>
          </div>
          <div className="mt-0.5 text-xs text-slate-400">
            <span title={format(new Date(entry.created_at), "PPpp")}>
              {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
            </span>
            {entry.wallet_transaction_id && <> · wallet tx <span className="font-mono">{entry.wallet_transaction_id.slice(0, 8)}</span></>}
            {entry.payment_id && <> · payment <span className="font-mono">{entry.payment_id.slice(0, 8)}</span></>}
            <button onClick={() => setOpen((o) => !o)} className="ml-2 underline hover:text-slate-200">
              {open ? "hide" : "details"}
            </button>
          </div>
        </div>
      </div>
      {open && (
        <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-950/50 p-2 text-xs text-slate-400">
          {JSON.stringify({
            id: entry.id,
            user_id: entry.user_id,
            listing_id: entry.listing_id,
            wallet_transaction_id: entry.wallet_transaction_id,
            payment_id: entry.payment_id,
            details: entry.details,
          }, null, 2)}
        </pre>
      )}
    </div>
  );
}
