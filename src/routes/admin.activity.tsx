import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { AdminPageHeader, panelCls } from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAdminActivityFeed } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/activity")({
  component: ActivityPage,
});

const TYPES: { key: string; label: string }[] = [
  { key: "signup", label: "Signups" },
  { key: "listing", label: "Listings" },
  { key: "payment", label: "Payments" },
  { key: "topup", label: "Top-ups" },
  { key: "report", label: "Reports" },
  { key: "kyc", label: "KYC" },
  { key: "broadcast", label: "Broadcasts" },
  { key: "audit", label: "Admin audit" },
];

function ActivityPage() {
  const feedFn = useServerFn(getAdminActivityFeed);
  const [types, setTypes] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);

  const { data, isFetching } = useQuery({
    queryKey: ["admin-activity-feed", types.sort().join(","), q, cursor],
    queryFn: () => feedFn({ data: { types, q, before: cursor, limit: 60 } }),
    staleTime: 15_000,
  });

  const toggle = (k: string) => {
    setCursor(null);
    setTypes((prev) => (prev.includes(k) ? prev.filter((t) => t !== k) : [...prev, k]));
  };

  return (
    <div>
      <AdminPageHeader title="Activity" subtitle="Unified feed across signups, listings, payments, top-ups, reports, KYC, broadcasts and admin actions." />

      <div className={panelCls + " mb-4 p-3"}>
        <div className="flex flex-wrap items-center gap-2">
          {TYPES.map((t) => {
            const active = types.includes(t.key);
            return (
              <button
                key={t.key}
                onClick={() => toggle(t.key)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  active
                    ? "border-indigo-400/60 bg-indigo-500/20 text-indigo-100"
                    : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                }`}
              >
                {t.label}
              </button>
            );
          })}
          {types.length > 0 && (
            <button onClick={() => { setTypes([]); setCursor(null); }} className="text-[11px] text-slate-400 underline">Clear</button>
          )}
          <div className="ml-auto flex w-full items-center gap-2 sm:w-auto">
            <Input
              value={q}
              onChange={(e) => { setQ(e.target.value); setCursor(null); }}
              placeholder="Search payload…"
              className="h-8 w-full bg-white/5 text-sm sm:w-64"
            />
          </div>
        </div>
      </div>

      <div className={panelCls + " divide-y divide-white/5"}>
        {(data?.items ?? []).map((item) => (
          <ActivityRow key={`${item.kind}-${item.id}-${item.at}`} item={item} />
        ))}
        {!isFetching && !data?.items.length && (
          <div className="px-4 py-12 text-center text-sm text-slate-400">No activity matches these filters.</div>
        )}
        {isFetching && (
          <div className="px-4 py-6 text-center text-xs text-slate-500">Loading…</div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-slate-500">{data?.items.length ?? 0} items</span>
        <div className="flex gap-2">
          {cursor && (
            <Button size="sm" variant="outline" onClick={() => setCursor(null)} className="rounded-full border-white/20 bg-white/5 text-slate-100 hover:bg-white/10">
              Back to latest
            </Button>
          )}
          {data?.nextCursor && (
            <Button size="sm" onClick={() => setCursor(data.nextCursor)} className="rounded-full">
              Load older
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

type FeedItem = {
  kind: string;
  at: string;
  id: string;
  payload: Record<string, string | number | boolean | null>;
};

function ActivityRow({ item }: { item: FeedItem }) {
  const p = item.payload;
  const ago = formatDistanceToNow(new Date(item.at), { addSuffix: true });

  const { text, href } = describe(item.kind, p);

  const body = (
    <div className="flex items-center gap-3 px-4 py-2.5 text-sm">
      <Badge variant="secondary" className="capitalize">{item.kind}</Badge>
      <span className="flex-1 truncate text-slate-300">{text}</span>
      <span className="shrink-0 text-xs text-slate-500">{ago}</span>
    </div>
  );

  if (!href) return <div>{body}</div>;
  return (
    <Link to={href} className="block transition hover:bg-white/5">
      {body}
    </Link>
  );
}

function describe(kind: string, p: Record<string, string | number | boolean | null>): { text: React.ReactNode; href?: string } {
  switch (kind) {
    case "signup":
      return { text: <>New signup: <span className="text-slate-100">{String(p.display_name ?? "user")}</span></>, href: "/admin/users" };
    case "listing":
      return { text: <>Listing posted: <span className="text-slate-100">{String(p.title ?? "")}</span></>, href: "/admin/listings" };
    case "payment":
      return { text: <>Payment ${Number(p.amount ?? 0).toFixed(2)} — {String(p.promotion_type ?? "—")} — <span className="text-slate-100">{String(p.status ?? "")}</span></>, href: "/admin/payments" };
    case "topup":
      return { text: <>Top-up ${Number(p.price_amount_usd ?? 0).toFixed(2)} — <span className="text-slate-100">{String(p.status ?? "")}</span></>, href: "/admin/topups" };
    case "report":
      return { text: <>Report ({String(p.reason ?? "")}) — <span className="text-slate-100">{String(p.status ?? "")}</span></>, href: "/admin/reports" };
    case "kyc":
      return { text: <>KYC submission — <span className="text-slate-100">{String(p.status ?? "")}</span></>, href: "/admin/kyc" };
    case "broadcast":
      return { text: <>Broadcast: <span className="text-slate-100">{String(p.title ?? "")}</span> → {String(p.recipient_count ?? 0)} recipients</>, href: "/admin/broadcasts" };
    case "audit":
      return { text: <>Admin action: <span className="text-slate-100">{String(p.action ?? "")}</span> {p.target_type ? `(${String(p.target_type)})` : ""}</>, href: "/admin/audit" };
    default:
      return { text: <>{kind}</> };
  }
}
