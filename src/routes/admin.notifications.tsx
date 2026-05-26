import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Inbox, BadgeCheck, Flag, Bitcoin, AlertCircle, Megaphone, CreditCard, CheckCheck,
} from "lucide-react";

import { AdminPageHeader, Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/admin/EmptyState";
import { RowSkeleton, ErrorFallback } from "@/components/admin/Skeletons";
import { StatusPill } from "@/components/admin/StatusPill";
import { getAdminInbox } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/notifications")({
  head: () => ({ meta: [{ title: "Inbox — Admin" }, { name: "robots", content: "noindex" }] }),
  component: NotificationsPage,
});

const TABS = [
  { value: "all", label: "All" },
  { value: "kyc", label: "KYC" },
  { value: "report", label: "Reports" },
  { value: "topup", label: "Top-ups" },
  { value: "error", label: "Errors" },
  { value: "broadcast", label: "Broadcasts" },
  { value: "payment", label: "Payments" },
] as const;
type Tab = (typeof TABS)[number]["value"];

const ICONS: Record<string, { icon: React.ComponentType<{ className?: string }>; tone: string }> = {
  kyc: { icon: BadgeCheck, tone: "bg-amber-500/15 text-amber-200" },
  report: { icon: Flag, tone: "bg-rose-500/15 text-rose-200" },
  topup: { icon: Bitcoin, tone: "bg-orange-500/15 text-orange-200" },
  error: { icon: AlertCircle, tone: "bg-red-500/15 text-red-200" },
  broadcast: { icon: Megaphone, tone: "bg-indigo-500/15 text-indigo-200" },
  payment: { icon: CreditCard, tone: "bg-fuchsia-500/15 text-fuchsia-200" },
};

const LAST_SEEN_KEY = "admin.inbox.lastSeenAt";

function NotificationsPage() {
  const fn = useServerFn(getAdminInbox);
  const [tab, setTab] = useState<Tab>("all");
  const [lastSeen, setLastSeen] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    const v = window.localStorage.getItem(LAST_SEEN_KEY);
    return v ? Number(v) : 0;
  });

  const kinds = tab === "all" ? [] : [tab];
  const q = useQuery({
    queryKey: ["admin-inbox", tab],
    queryFn: () => fn({ data: { kinds, limit: 120 } }),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const items = q.data?.items ?? [];
  const unseenCount = useMemo(
    () => items.filter((i) => new Date(i.at).getTime() > lastSeen).length,
    [items, lastSeen],
  );

  const markAllSeen = () => {
    const now = Date.now();
    setLastSeen(now);
    if (typeof window !== "undefined") window.localStorage.setItem(LAST_SEEN_KEY, String(now));
  };

  // Auto-mark seen when leaving page so badge stays accurate
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined") window.localStorage.setItem(LAST_SEEN_KEY, String(Date.now()));
    };
  }, []);

  return (
    <div>
      <AdminPageHeader
        title="Inbox"
        subtitle="Everything that needs your attention — KYC, reports, top-ups, errors, broadcasts."
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={markAllSeen}
            className="h-8 rounded-full border-white/15 bg-white/5 text-xs text-slate-100 hover:bg-white/10"
          >
            <CheckCheck className="mr-1.5 h-3.5 w-3.5" />
            Mark all as seen
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="w-full">
        <div className="-mx-3 mb-3 overflow-x-auto px-3 sm:mx-0 sm:px-0">
          <TabsList className="w-max bg-white/5">
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="whitespace-nowrap">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>

      <Panel>
        {q.isLoading && <RowSkeleton rows={8} />}

        {q.isError && (
          <ErrorFallback
            message={(q.error as Error | undefined)?.message ?? "Inbox failed to load."}
            onRetry={() => q.refetch()}
          />
        )}

        {!q.isLoading && !q.isError && items.length === 0 && (
          <EmptyState
            icon={Inbox}
            title="All clear"
            description="Nothing needs attention right now. Pending reviews, failed payments, and errors will land here."
          />
        )}

        {!q.isLoading && !q.isError && items.length > 0 && (
          <>
            <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
              <span>
                {items.length.toLocaleString()} item{items.length === 1 ? "" : "s"}
                {unseenCount > 0 && (
                  <span className="ml-2 rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-semibold text-rose-200">
                    {unseenCount} new
                  </span>
                )}
              </span>
            </div>
            <ul className="divide-y divide-white/5">
              {items.map((it) => {
                const meta = ICONS[it.kind] ?? ICONS.broadcast;
                const isNew = new Date(it.at).getTime() > lastSeen;
                return (
                  <li key={it.id}>
                    <Link
                      to={it.link}
                      className="group flex items-start gap-3 rounded-lg px-2 py-2.5 hover:bg-white/5"
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
