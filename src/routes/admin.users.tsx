import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight, Users as UsersIcon } from "lucide-react";
import { AdminPageHeader, Panel } from "@/components/admin/ui";
import { AdminTableToolbar, toCsv, downloadCsv } from "@/components/admin/AdminTableToolbar";
import { BulkActionBar } from "@/components/admin/BulkActionBar";
import { EmptyState } from "@/components/admin/EmptyState";
import { RowSkeleton, ErrorFallback } from "@/components/admin/Skeletons";
import {
  listUsersAdmin, setUserRole, banUser, unbanUser, deleteUserAdmin, sendPasswordReset,
  adminAdjustWallet,
  getUserSummary, getUserListingsPage, getUserWalletTxsPage, getUserPaymentsPage,
} from "@/lib/admin.functions";
import { bulkUsersAction } from "@/lib/extras.functions";

export const Route = createFileRoute("/admin/users")({ component: UsersPage });

type ListUser = {
  id: string; email: string; display_name: string; created_at: string;
  roles: string[]; banned: boolean; banned_until: string | null; wallet_balance: number;
};

function useDebounced<T>(v: T, ms = 300) {
  const [out, setOut] = useState(v);
  useEffect(() => { const t = setTimeout(() => setOut(v), ms); return () => clearTimeout(t); }, [v, ms]);
  return out;
}

function UsersPage() {
  const qc = useQueryClient();
  const [qInput, setQInput] = useState("");
  const q = useDebounced(qInput, 300);
  const [filter, setFilter] = useState<"all" | "admins" | "moderators" | "banned">("all");
  const [page, setPage] = useState(1);
  const perPage = 25;
  const [active, setActive] = useState<ListUser | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => { setPage(1); setSelected(new Set()); }, [q, filter]);

  const listFn = useServerFn(listUsersAdmin);
  const roleFn = useServerFn(setUserRole);
  const banFn = useServerFn(banUser);
  const unbanFn = useServerFn(unbanUser);
  const delFn = useServerFn(deleteUserAdmin);
  const resetFn = useServerFn(sendPasswordReset);
  const bulkFn = useServerFn(bulkUsersAction);

  const usersQ = useQuery({
    queryKey: ["admin-users-list", q, filter, page],
    queryFn: () => listFn({ data: { q, filter, page, perPage } }),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-users-list"] });

  const setRole = useMutation({
    mutationFn: (v: { userId: string; role: "admin" | "moderator"; add: boolean }) => roleFn({ data: v }),
    onSuccess: () => { toast.success("Role updated"); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const ban = useMutation({ mutationFn: (v: { userId: string; days: number }) => banFn({ data: v }), onSuccess: () => { toast.success("Banned"); refresh(); }, onError: (e: Error) => toast.error(e.message) });
  const unban = useMutation({ mutationFn: (userId: string) => unbanFn({ data: { userId } }), onSuccess: () => { toast.success("Unbanned"); refresh(); }, onError: (e: Error) => toast.error(e.message) });
  const del = useMutation({ mutationFn: (userId: string) => delFn({ data: { userId } }), onSuccess: () => { toast.success("Deleted"); refresh(); setActive(null); }, onError: (e: Error) => toast.error(e.message) });
  const reset = useMutation({ mutationFn: (email: string) => resetFn({ data: { email } }), onSuccess: () => toast.success("Reset link generated"), onError: (e: Error) => toast.error(e.message) });
  const bulk = useMutation({
    mutationFn: (v: { action: "ban" | "unban" | "delete"; days?: number }) => bulkFn({ data: { ids: [...selected], action: v.action, days: v.days } }),
    onSuccess: () => { toast.success("Done"); setSelected(new Set()); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const toggle = (id: string) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected(s => s.size === users.length ? new Set() : new Set(users.map(u => u.id)));

  const users = (usersQ.data?.users ?? []) as ListUser[];
  const total = usersQ.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div>
      <AdminPageHeader title="Users" subtitle={`${total.toLocaleString()} match · page ${page} of ${totalPages}`} />

      <AdminTableToolbar
        q={qInput}
        onQ={setQInput}
        placeholder="Search name or email…"
        filters={[{
          value: filter, onChange: (v) => setFilter(v as typeof filter), label: "Filter",
          options: [
            { value: "all", label: "All users" },
            { value: "admins", label: "Admins" },
            { value: "moderators", label: "Moderators" },
            { value: "banned", label: "Banned" },
          ],
        }]}
        total={total}
        onExportCsv={() => downloadCsv(
          `users-${new Date().toISOString().slice(0, 10)}.csv`,
          toCsv(users.map((u) => ({ ...u, roles: u.roles.join("|") }))),
        )}
      />

      <Panel>
        {users.length > 0 && (
          <label className="mb-2 flex items-center gap-2 text-xs text-slate-400">
            <input type="checkbox" checked={selected.size === users.length && users.length > 0} onChange={toggleAll} className="h-4 w-4" />
            Select all on page
          </label>
        )}
        <div className="space-y-2">
          {usersQ.isLoading && <RowSkeleton rows={6} />}
          {usersQ.isError && (
            <ErrorFallback
              title="Couldn't load users"
              message={(usersQ.error as Error | undefined)?.message}
              onRetry={() => usersQ.refetch()}
              isRetrying={usersQ.isFetching}
            />
          )}
          {!usersQ.isLoading && users.map(u => (
            <div key={u.id} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
              <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggle(u.id)} className="mt-1 h-4 w-4" />
              <div className="flex-1 min-w-0 flex flex-wrap items-start justify-between gap-2">
                <button onClick={() => setActive(u)} className="min-w-0 text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-slate-100 hover:underline">{u.display_name}</span>
                    {u.banned && <Badge variant="destructive">Banned</Badge>}
                    {u.roles.map(r => <Badge key={r} variant={r === "admin" ? "default" : "secondary"} className="capitalize">{r}</Badge>)}
                  </div>
                  <div className="text-xs text-slate-400">{u.email} · ${u.wallet_balance.toFixed(2)} · joined {format(new Date(u.created_at), "MMM d, yyyy")}</div>
                </button>
                <div className="flex flex-wrap gap-1.5">
                  <Button size="sm" variant="outline" className="rounded-full border-white/20 bg-white/5 text-slate-100 hover:bg-white/10" onClick={() => setActive(u)}>View</Button>
                  <Button size="sm" variant="outline" className="rounded-full border-white/20 bg-white/5 text-slate-100 hover:bg-white/10" onClick={() => setRole.mutate({ userId: u.id, role: "moderator", add: !u.roles.includes("moderator") })}>{u.roles.includes("moderator") ? "− Mod" : "+ Mod"}</Button>
                  <Button size="sm" variant="outline" className="rounded-full border-white/20 bg-white/5 text-slate-100 hover:bg-white/10" onClick={() => setRole.mutate({ userId: u.id, role: "admin", add: !u.roles.includes("admin") })}>{u.roles.includes("admin") ? "− Admin" : "+ Admin"}</Button>
                  {u.banned
                    ? <Button size="sm" variant="outline" className="rounded-full border-white/20 bg-white/5 text-slate-100 hover:bg-white/10" onClick={() => unban.mutate(u.id)}>Unban</Button>
                    : <Button size="sm" variant="outline" className="rounded-full border-white/20 bg-white/5 text-slate-100 hover:bg-white/10" onClick={() => { const d = Number(prompt("Ban for how many days?", "7") ?? "0"); if (d > 0) ban.mutate({ userId: u.id, days: d }); }}>Ban</Button>}
                  <Button size="sm" variant="outline" className="rounded-full border-white/20 bg-white/5 text-slate-100 hover:bg-white/10" onClick={() => reset.mutate(u.email)}>Reset pwd</Button>
                  <Button size="sm" variant="destructive" className="rounded-full" onClick={() => { if (confirm(`Delete ${u.email}? This cannot be undone.`)) del.mutate(u.id); }}>Delete</Button>
                </div>
              </div>
            </div>
          ))}
          {!usersQ.isLoading && !users.length && (
            <EmptyState
              icon={UsersIcon}
              title={qInput || filter !== "all" ? "No users match" : "No users yet"}
              description={qInput || filter !== "all" ? "Try clearing filters." : "User accounts will appear here as people sign up."}
            />
          )}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="text-xs text-slate-500">{usersQ.data?.scanExhausted === false ? `Scanning first ${(usersQ.data?.scannedPages ?? 0) * 200} accounts` : ""}</div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="rounded-full"><ChevronLeft className="h-4 w-4" /> Prev</Button>
            <span className="text-xs text-slate-400">Page {page} / {totalPages}</span>
            <Button size="sm" variant="outline" disabled={!usersQ.data?.hasMore} onClick={() => setPage(p => p + 1)} className="rounded-full">Next <ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </Panel>

      <BulkActionBar
        count={selected.size}
        onClear={() => setSelected(new Set())}
        actions={[
          { label: "Ban", onClick: () => { const d = Number(prompt("Ban for how many days?", "7") ?? "0"); if (d > 0) bulk.mutate({ action: "ban", days: d }); } },
          { label: "Unban", onClick: () => bulk.mutate({ action: "unban" }) },
          { label: "Delete", variant: "destructive", onClick: () => { if (confirm(`Permanently delete ${selected.size} users? This cannot be undone.`)) bulk.mutate({ action: "delete" }); } },
        ]}
      />

      <UserDetailSheet user={active} onClose={() => setActive(null)} onChanged={refresh} />
    </div>
  );
}

const PAGE_SIZE = 20;

function UserDetailSheet({ user, onClose, onChanged }: { user: ListUser | null; onClose: () => void; onChanged: () => void }) {
  const summaryFn = useServerFn(getUserSummary);
  const listingsFn = useServerFn(getUserListingsPage);
  const txsFn = useServerFn(getUserWalletTxsPage);
  const paymentsFn = useServerFn(getUserPaymentsPage);
  const adjustFn = useServerFn(adminAdjustWallet);
  const qc = useQueryClient();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  const summary = useQuery({
    queryKey: ["admin-user-summary", user?.id],
    queryFn: () => summaryFn({ data: { userId: user!.id } }),
    enabled: !!user,
  });

  const listings = useInfiniteQuery({
    queryKey: ["admin-user-listings", user?.id],
    queryFn: ({ pageParam }) => listingsFn({ data: { userId: user!.id, offset: pageParam, limit: PAGE_SIZE } }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.offset + last.items.length < last.total ? last.offset + last.items.length : undefined),
    enabled: !!user,
  });

  const txs = useInfiniteQuery({
    queryKey: ["admin-user-txs", user?.id],
    queryFn: ({ pageParam }) => txsFn({ data: { userId: user!.id, offset: pageParam, limit: PAGE_SIZE } }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.offset + last.items.length < last.total ? last.offset + last.items.length : undefined),
    enabled: !!user,
  });

  const payments = useInfiniteQuery({
    queryKey: ["admin-user-payments", user?.id],
    queryFn: ({ pageParam }) => paymentsFn({ data: { userId: user!.id, offset: pageParam, limit: PAGE_SIZE } }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.offset + last.items.length < last.total ? last.offset + last.items.length : undefined),
    enabled: !!user,
  });

  const adjust = useMutation({
    mutationFn: (v: { amount: number; description: string }) =>
      adjustFn({ data: { userId: user!.id, amount: v.amount, description: v.description } }),
    onSuccess: () => {
      toast.success("Wallet adjusted");
      setAmount(""); setReason("");
      qc.invalidateQueries({ queryKey: ["admin-user-summary", user?.id] });
      qc.invalidateQueries({ queryKey: ["admin-user-txs", user?.id] });
      onChanged();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const s = summary.data;
  const listingItems = listings.data?.pages.flatMap(p => p.items) ?? [];
  const txItems = txs.data?.pages.flatMap(p => p.items) ?? [];
  const paymentItems = payments.data?.pages.flatMap(p => p.items) ?? [];

  return (
    <Sheet open={!!user} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" className="w-full overflow-y-auto bg-slate-950 text-slate-100 sm:max-w-xl">
        {user && (
          <>
            <SheetHeader>
              <SheetTitle className="text-slate-100">{user.display_name}</SheetTitle>
              <SheetDescription className="text-slate-400">{user.email}</SheetDescription>
            </SheetHeader>

            <div className="mt-4 space-y-5">
              <section className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
                <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                  <span>Joined {format(new Date(user.created_at), "MMM d, yyyy")}</span>
                  <span>·</span>
                  <span>Wallet ${user.wallet_balance.toFixed(2)}</span>
                  <span>·</span>
                  <span>{user.banned ? "Banned" : "Active"}</span>
                  <span>·</span>
                  <span>{s?.threadsCount ?? 0} threads</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {user.roles.length ? user.roles.map(r => <Badge key={r} variant={r === "admin" ? "default" : "secondary"} className="capitalize">{r}</Badge>) : <Badge variant="outline">user</Badge>}
                </div>
              </section>

              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Adjust wallet</h3>
                <div className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
                  <Input type="number" step="0.01" placeholder="±$ amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="bg-white/5 text-slate-100" />
                  <Input placeholder="Reason (required)" value={reason} onChange={(e) => setReason(e.target.value)} className="bg-white/5 text-slate-100" />
                  <Button size="sm" onClick={() => {
                    const n = Number(amount);
                    if (!n || !reason.trim()) { toast.error("Amount and reason required"); return; }
                    adjust.mutate({ amount: n, description: reason.trim() });
                  }} disabled={adjust.isPending}>Apply</Button>
                </div>
                <p className="mt-1 text-xs text-slate-500">Positive credits, negative debits. Logged to audit trail.</p>
              </section>

              <Separator className="bg-white/10" />

              <PaginatedSection
                title={`Listings (${s?.listingsTotal ?? 0})`}
                badges={Object.entries(s?.statusCounts ?? {}).map(([k, v]) => `${k}: ${v}`)}
                items={listingItems}
                renderItem={(l: any) => (
                  <div key={l.id} className="flex items-center justify-between gap-2 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-sm">
                    <span className="truncate">{l.title}</span>
                    <span className="shrink-0 text-xs text-slate-400">{l.status} · {format(new Date(l.created_at), "MMM d")}</span>
                  </div>
                )}
                hasMore={!!listings.hasNextPage}
                loading={listings.isFetchingNextPage}
                onLoadMore={() => listings.fetchNextPage()}
              />

              <PaginatedSection
                title={`Wallet transactions (${s?.walletTxsTotal ?? 0})`}
                items={txItems}
                renderItem={(t: any) => (
                  <div key={t.id} className="flex items-center justify-between gap-2 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-sm">
                    <span className="truncate">
                      <span className="mr-2 inline-block w-16 text-xs uppercase tracking-wider text-slate-400">{t.type}</span>
                      {t.description ?? ""}
                    </span>
                    <span className={`shrink-0 text-xs ${Number(t.amount_usd) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {Number(t.amount_usd) >= 0 ? "+" : ""}${Number(t.amount_usd).toFixed(2)}
                    </span>
                  </div>
                )}
                hasMore={!!txs.hasNextPage}
                loading={txs.isFetchingNextPage}
                onLoadMore={() => txs.fetchNextPage()}
              />

              <PaginatedSection
                title={`Payments (${s?.paymentsTotal ?? 0})`}
                items={paymentItems}
                renderItem={(p: any) => (
                  <div key={p.id} className="flex items-center justify-between gap-2 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-sm">
                    <span className="truncate">{p.promotion_type ?? "payment"} · <span className="text-xs text-slate-400">{p.status}</span></span>
                    <span className="shrink-0 text-xs text-slate-300">${Number(p.amount).toFixed(2)} {p.currency}</span>
                  </div>
                )}
                hasMore={!!payments.hasNextPage}
                loading={payments.isFetchingNextPage}
                onLoadMore={() => payments.fetchNextPage()}
              />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function PaginatedSection<T>({ title, badges, items, renderItem, hasMore, loading, onLoadMore }: {
  title: string; badges?: string[]; items: T[]; renderItem: (item: T) => React.ReactNode;
  hasMore: boolean; loading: boolean; onLoadMore: () => void;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</h3>
      </div>
      {badges && badges.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5 text-xs text-slate-300">
          {badges.map(b => <Badge key={b} variant="outline" className="border-white/20 text-slate-200">{b}</Badge>)}
        </div>
      )}
      <div className="space-y-1">
        {items.map(renderItem)}
        {!items.length && <div className="text-xs text-slate-500">Nothing here.</div>}
      </div>
      {hasMore && (
        <div className="mt-2 text-center">
          <Button size="sm" variant="outline" className="rounded-full" onClick={onLoadMore} disabled={loading}>
            {loading ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}
    </section>
  );
}
