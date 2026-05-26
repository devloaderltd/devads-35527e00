import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Inbox, BadgeCheck, Flag, Bitcoin, AlertCircle, Megaphone, CreditCard, CheckCheck, Check,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { AdminPageHeader, Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/admin/EmptyState";
import { RowSkeleton, ErrorFallback } from "@/components/admin/Skeletons";
import { StatusPill } from "@/components/admin/StatusPill";
import { getAdminInbox } from "@/lib/admin.functions";
import {
  type InboxKind,
  countUnseen,
  getAllLastSeen,
  isUnseen,
  markAllSeen,
  setLastSeen,
  subscribeInboxSeen,
} from "@/lib/admin-inbox-seen";

export const Route = createFileRoute("/admin/notifications")({
  head: () => ({ meta: [{ title: "Inbox — Admin" }, { name: "robots", content: "noindex" }] }),
  component: NotificationsPage,
});

type Tab = "all" | InboxKind;

const TABS: Array<{ value: Tab; label: string }> = [
  { value: "all", label: "All" },
  { value: "kyc", label: "KYC" },
  { value: "report", label: "Reports" },
  { value: "topup", label: "Top-ups" },
  { value: "error", label: "Errors" },
  { value: "broadcast", label: "Broadcasts" },
  { value: "payment", label: "Payments" },
];

const ICONS: Record<InboxKind, { icon: React.ComponentType<{ className?: string }>; tone: string }> = {
  kyc: { icon: BadgeCheck, tone: "bg-amber-500/15 text-amber-200" },
  report: { icon: Flag, tone: "bg-rose-500/15 text-rose-200" },
  topup: { icon: Bitcoin, tone: "bg-orange-500/15 text-orange-200" },
  error: { icon: AlertCircle, tone: "bg-red-500/15 text-red-200" },
  broadcast: { icon: Megaphone, tone: "bg-indigo-500/15 text-indigo-200" },
  payment: { icon: CreditCard, tone: "bg-fuchsia-500/15 text-fuchsia-200" },
};

const EMPTY_COPY: Record<Tab, { icon: LucideIcon; title: string; description: string }> = {
  all: { icon: Inbox, title: "All clear", description: "Nothing needs attention right now. Pending reviews, failed payments, and errors will land here." },
  kyc: { icon: BadgeCheck, title: "No new KYC submissions", description: "Identity verification requests will appear here as users submit them." },
  report: { icon: Flag, title: "No open reports", description: "User-submitted reports about listings and accounts will show up here." },
  topup: { icon: Bitcoin, title: "No pending top-ups", description: "Awaiting-payment wallet top-ups will appear here." },
  error: { icon: AlertCircle, title: "No errors", description: "Server and client errors from the last 24 hours will show up here." },
  broadcast: { icon: Megaphone, title: "No broadcasts", description: "Admin-wide announcements will be listed here." },
  payment: { icon: CreditCard, title: "No payment alerts", description: "Failed or refunded payments will appear here." },
};

// Subscribe to localStorage changes so badges stay in sync.
function useInboxSeenTick() {
  return useSyncExternalStore(
    subscribeInboxSeen,
    () => {
      const all = getAllLastSeen();
      return JSON.stringify(all);
    },
    () => "",
  );
}

function NotificationsPage() {
  const fn = useServerFn(getAdminInbox);
  const [tab, setTab] = useState<Tab>("all");
  useInboxSeenTick();

  const kinds = tab === "all" ? [] : [tab];
  const q = useQuery({
    queryKey: ["admin-inbox", tab],
    queryFn: () => fn({ data: { kinds, limit: 120 } }),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  // For the tab badges we need a global view (all kinds), not just current tab.
  const allQ = useQuery({
    queryKey: ["admin-inbox", "all"],
    queryFn: () => fn({ data: { kinds: [], limit: 200 } }),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const items = q.data?.items ?? [];
  const allItems = allQ.data?.items ?? [];

  const tabCounts = useMemo(() => {
    const out: Record<Tab, number> = {
      all: 0, kyc: 0, report: 0, topup: 0, error: 0, broadcast: 0, payment: 0,
    };
    out.all = countUnseen(allItems);
    (Object.keys(out) as Tab[]).forEach((k) => {
      if (k !== "all") out[k] = countUnseen(allItems, k as InboxKind);
    });
    return out;
  }, [allItems]);

  const onMarkAll = () => markAllSeen(allItems);
  const onMarkTab = () => {
    if (tab === "all") {
      markAllSeen(allItems);
    } else {
      // Mark this kind based on newest item we've observed
      const newest = items.reduce((max, it) => {
        const t = new Date(it.at).getTime();
        return t > max ? t : max;
      }, 0);
      if (newest > 0) setLastSeen(tab, newest);
      else setLastSeen(tab);
    }
  };

  // Auto-mark seen for the active kind shortly after view
  useEffect(() => {
    if (q.isLoading || q.isError || items.length === 0) return;
    const t = setTimeout(() => {
      if (tab === "all") {
        markAllSeen(items);
      } else {
        const newest = items.reduce((m, it) => Math.max(m, new Date(it.at).getTime()), 0);
        if (newest > 0) setLastSeen(tab, newest);
      }
    }, 1500);
    return () => clearTimeout(t);
  }, [items, tab, q.isLoading, q.isError]);

  const headerActions = (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={onMarkTab}
        disabled={tab === "all" ? tabCounts.all === 0 : tabCounts[tab] === 0}
        className="h-8 rounded-full border-white/15 bg-white/5 text-xs text-slate-100 hover:bg-white/10 disabled:opacity-40"
      >
        <Check className="mr-1.5 h-3.5 w-3.5" />
        Mark tab seen
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={onMarkAll}
        disabled={tabCounts.all === 0}
        className="h-8 rounded-full border-white/15 bg-white/5 text-xs text-slate-100 hover:bg-white/10 disabled:opacity-40"
      >
        <CheckCheck className="mr-1.5 h-3.5 w-3.5" />
        Mark all seen
      </Button>
    </div>
  );

  const empty = EMPTY_COPY[tab];

  return (
    <div>
      <AdminPageHeader
        title="Inbox"
        subtitle="Everything that needs your attention — KYC, reports, top-ups, errors, broadcasts."
        actions={headerActions}
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="w-full">
        <div className="-mx-3 mb-3 overflow-x-auto px-3 sm:mx-0 sm:px-0">
          <TabsList className="w-max bg-white/5">
            {TABS.map((t) => {
              const c = tabCounts[t.value];
              return (
                <TabsTrigger key={t.value} value={t.value} className="whitespace-nowrap gap-1.5">
                  {t.label}
                  {c > 0 && (
                    <span className="rounded-full bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-rose-200">
                      {c > 99 ? "99+" : c}
                    </span>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>
      </Tabs>

      <Panel>
        {q.isLoading && <RowSkeleton rows={8} />}

        {q.isError && (
          <ErrorFallback
            title="Inbox failed to load"
              message={(q.error as Error | undefined)?.message}
              onRetry={() => q.refetch()}
              isRetrying={q.isFetching}
            />
        )}

        {!q.isLoading && !q.isError && items.length === 0 && (
          <EmptyState icon={empty.icon} title={empty.title} description={empty.description} />
        )}

        {!q.isLoading && !q.isError && items.length > 0 && (
          <>
            <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
              <span>
                {items.length.toLocaleString()} item{items.length === 1 ? "" : "s"}
                {(() => {
                  const unseenHere = tab === "all" ? tabCounts.all : tabCounts[tab];
                  return unseenHere > 0 ? (
                    <span className="ml-2 rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-semibold text-rose-200">
                      {unseenHere} new
                    </span>
                  ) : null;
                })()}
              </span>
            </div>
            <ul className="divide-y divide-white/5">
              {items.map((it) => {
                const meta = ICONS[it.kind as InboxKind] ?? ICONS.broadcast;
                const isNew = isUnseen({ kind: it.kind as InboxKind, at: it.at });
                return (
                  <li key={it.id}>
                    <Link
                      to={it.link}
                      className={`group flex items-start gap-3 rounded-lg px-2 py-2.5 transition hover:bg-white/5 ${
                        isNew ? "bg-white/[0.02]" : ""
                      }`}
                    >
                      <span
                        className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${meta.tone}`}
                      >
                        <meta.icon className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium text-slate-100">
                            {it.title}
                          </span>
                          {isNew && (
                            <span
                              aria-label="New"
                              className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400"
                            />
                          )}
                        </div>
                        {it.body && (
                          <div className="mt-0.5 line-clamp-1 text-xs text-slate-400">
                            {it.body}
                          </div>
                        )}
                        <div className="mt-1 flex items-center gap-2">
                          <StatusPill
                            tone={
                              it.severity === "danger"
                                ? "danger"
                                : it.severity === "warning"
                                ? "warning"
                                : "info"
                            }
                          >
                            {it.kind}
                          </StatusPill>
                          <span className="text-[11px] text-slate-500">
                            {formatDistanceToNow(new Date(it.at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Panel>
    </div>
  );
}
