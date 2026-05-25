import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format, formatDistanceToNow } from "date-fns";
import { Wallet, Shield, Ban, Sparkles, Settings as SettingsIcon, Coins, User as UserIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { AdminPageHeader, Panel } from "@/components/admin/ui";
import { getAuditLog } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/audit")({ component: AuditPage });

const CATEGORIES = [
  { key: "all", label: "All" },
  { key: "wallet", label: "Wallet" },
  { key: "roles", label: "Roles" },
  { key: "bans", label: "Bans" },
  { key: "listings", label: "Listings" },
  { key: "settings", label: "Settings" },
  { key: "topups", label: "Top-ups" },
  { key: "users", label: "Users" },
] as const;

type Category = typeof CATEGORIES[number]["key"];

type Entry = {
  id: string; action: string; actor_id: string | null;
  target_type: string | null; target_id: string | null;
  metadata: Record<string, unknown>; created_at: string;
  actor_name: string | null; target_name: string | null;
};

function categoryFor(action: string): { icon: React.ReactNode; tone: string } {
  if (action.startsWith("wallet.")) return { icon: <Wallet className="h-3.5 w-3.5" />, tone: "bg-emerald-500/15 text-emerald-200" };
  if (action.startsWith("role.")) return { icon: <Shield className="h-3.5 w-3.5" />, tone: "bg-indigo-500/15 text-indigo-200" };
  if (action === "user.ban" || action === "user.unban") return { icon: <Ban className="h-3.5 w-3.5" />, tone: "bg-red-500/15 text-red-200" };
  if (action.startsWith("listing.")) return { icon: <Sparkles className="h-3.5 w-3.5" />, tone: "bg-fuchsia-500/15 text-fuchsia-200" };
  if (action.startsWith("settings.")) return { icon: <SettingsIcon className="h-3.5 w-3.5" />, tone: "bg-slate-500/15 text-slate-200" };
  if (action.startsWith("topup.")) return { icon: <Coins className="h-3.5 w-3.5" />, tone: "bg-amber-500/15 text-amber-200" };
  return { icon: <UserIcon className="h-3.5 w-3.5" />, tone: "bg-slate-500/15 text-slate-200" };
}

function humanize(e: Entry): string {
  const target = e.target_name ?? e.target_id?.slice(0, 8) ?? "";
  const m = e.metadata ?? {};
  switch (e.action) {
    case "wallet.adjust": {
      const amt = Number((m as any).amount ?? 0);
      const sign = amt >= 0 ? "+" : "";
      const desc = (m as any).description ? ` — "${(m as any).description}"` : "";
      return `Adjusted wallet ${sign}$${amt.toFixed(2)} for ${target}${desc}`;
    }
    case "role.grant": return `Granted ${(m as any).role} to ${target}`;
    case "role.revoke": return `Revoked ${(m as any).role} from ${target}`;
    case "user.ban": return `Banned ${target} for ${(m as any).days} day(s)`;
    case "user.unban": return `Unbanned ${target}`;
    case "user.delete": return `Deleted user ${target}`;
    case "user.password_reset": return `Generated password reset for ${target}`;
    case "listing.grant_featured": return `Featured listing "${target}" for ${(m as any).days ?? 7} days`;
    case "listing.grant_bump": return `Bumped listing "${target}"`;
    case "listing.edit": return `Edited listing "${target}"`;
    case "settings.update": return `Updated site settings (${Object.keys(m).filter(k => k !== "updated_at").join(", ")})`;
    case "topup.retry_credit": return `Retried top-up credit for $${Number((m as any).amount ?? 0).toFixed(2)}`;
    default: {
      const tail = e.target_type ? ` on ${e.target_type}:${target}` : "";
      return `${e.action}${tail}`;
    }
  }
}

function AuditPage() {
  const fn = useServerFn(getAuditLog);
  const [category, setCategory] = useState<Category>("all");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 50;

  const { data, isLoading } = useQuery({
    queryKey: ["audit-log", category, q, from, to, page],
    queryFn: () => fn({ data: { category, q, from, to, page, perPage } }),
  });

  const entries = (data?.entries ?? []) as Entry[];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const reset = () => setPage(1);

  return (
    <div>
      <AdminPageHeader title="Audit log" subtitle={`${total.toLocaleString()} entries · page ${page} of ${totalPages}`} />

      <Panel className="mb-3">
        <div className="flex flex-wrap items-center gap-2">
          {CATEGORIES.map(c => (
            <Button key={c.key} size="sm" variant={category === c.key ? "default" : "outline"} className="rounded-full" onClick={() => { setCategory(c.key); reset(); }}>{c.label}</Button>
          ))}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Input placeholder="Search action or target id…" value={q} onChange={(e) => { setQ(e.target.value); reset(); }} className="w-56 rounded-full border-white/10 bg-white/5 text-slate-100" />
            <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); reset(); }} className="rounded-full border-white/10 bg-white/5 text-slate-100" />
            <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); reset(); }} className="rounded-full border-white/10 bg-white/5 text-slate-100" />
          </div>
        </div>
      </Panel>

      <Panel>
        <div className="space-y-2">
          {isLoading && <div className="py-10 text-center text-sm text-slate-400">Loading…</div>}
          {!isLoading && entries.map(e => <AuditRow key={e.id} entry={e} />)}
          {!isLoading && !entries.length && <div className="py-10 text-center text-sm text-slate-400">No audit entries match these filters.</div>}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="text-xs text-slate-500">{total.toLocaleString()} total</div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="rounded-full"><ChevronLeft className="h-4 w-4" /> Prev</Button>
            <span className="text-xs text-slate-400">Page {page} / {totalPages}</span>
            <Button size="sm" variant="outline" disabled={!data?.hasMore} onClick={() => setPage(p => p + 1)} className="rounded-full">Next <ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function AuditRow({ entry }: { entry: Entry }) {
  const [open, setOpen] = useState(false);
  const cat = useMemo(() => categoryFor(entry.action), [entry.action]);
  const hasMeta = entry.metadata && Object.keys(entry.metadata as object).length > 0;
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
      <div className="flex flex-wrap items-start gap-2">
        <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md ${cat.tone}`}>{cat.icon}</span>
        <div className="min-w-0 flex-1">
          <div className="text-slate-100">{humanize(entry)}</div>
          <div className="mt-0.5 text-xs text-slate-400">
            by <span className="text-slate-300">{entry.actor_name ?? entry.actor_id?.slice(0, 8) ?? "system"}</span>
            {" · "}
            <span title={format(new Date(entry.created_at), "PPpp")}>{formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}</span>
            {hasMeta && <button onClick={() => setOpen(o => !o)} className="ml-2 underline hover:text-slate-200">{open ? "hide" : "details"}</button>}
          </div>
        </div>
        <Badge variant="secondary" className="shrink-0 font-mono text-[10px]">{entry.action}</Badge>
      </div>
      {open && hasMeta && (
        <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-950/50 p-2 text-xs text-slate-400">{JSON.stringify(entry.metadata, null, 2)}</pre>
      )}
    </div>
  );
}
