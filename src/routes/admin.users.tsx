import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { format } from "date-fns";
import { AdminPageHeader, Panel } from "@/components/admin/ui";
import {
  listUsersAdmin, setUserRole, banUser, unbanUser, deleteUserAdmin, sendPasswordReset,
  getUserDetails, adminAdjustWallet,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/users")({ component: UsersPage });

type ListUser = {
  id: string; email: string; display_name: string; created_at: string;
  roles: string[]; banned: boolean; banned_until: string | null; wallet_balance: number;
};

function UsersPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "admins" | "moderators" | "banned">("all");
  const [active, setActive] = useState<ListUser | null>(null);

  const listFn = useServerFn(listUsersAdmin);
  const roleFn = useServerFn(setUserRole);
  const banFn = useServerFn(banUser);
  const unbanFn = useServerFn(unbanUser);
  const delFn = useServerFn(deleteUserAdmin);
  const resetFn = useServerFn(sendPasswordReset);

  const usersQ = useQuery({
    queryKey: ["admin-users-list", q, filter],
    queryFn: () => listFn({ data: { q, filter } }),
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

  const users = (usersQ.data?.users ?? []) as ListUser[];

  return (
    <div>
      <AdminPageHeader title="Users" subtitle={`${users.length} users`} />
      <div className="mb-3 flex flex-wrap gap-2">
        {(["all", "admins", "moderators", "banned"] as const).map(f => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} className="rounded-full capitalize" onClick={() => setFilter(f)}>{f}</Button>
        ))}
        <Input placeholder="Search name or email…" value={q} onChange={(e) => setQ(e.target.value)} className="ml-auto w-full max-w-xs rounded-full border-white/10 bg-white/5 text-slate-100" />
      </div>
      <Panel>
        <div className="space-y-2">
          {users.map(u => (
            <div key={u.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
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
          {!users.length && <div className="py-10 text-center text-sm text-slate-400">No users.</div>}
        </div>
      </Panel>

      <UserDetailSheet
        user={active}
        onClose={() => setActive(null)}
        onChanged={refresh}
      />
    </div>
  );
}

function UserDetailSheet({ user, onClose, onChanged }: { user: ListUser | null; onClose: () => void; onChanged: () => void }) {
  const detailFn = useServerFn(getUserDetails);
  const adjustFn = useServerFn(adminAdjustWallet);
  const qc = useQueryClient();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  const detail = useQuery({
    queryKey: ["admin-user-detail", user?.id],
    queryFn: () => detailFn({ data: { userId: user!.id } }),
    enabled: !!user,
  });

  const adjust = useMutation({
    mutationFn: (v: { amount: number; description: string }) =>
      adjustFn({ data: { userId: user!.id, amount: v.amount, description: v.description } }),
    onSuccess: () => {
      toast.success("Wallet adjusted");
      setAmount(""); setReason("");
      qc.invalidateQueries({ queryKey: ["admin-user-detail", user?.id] });
      onChanged();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const d = detail.data;
  const statusCount = (d?.listings ?? []).reduce<Record<string, number>>((acc, l) => {
    acc[l.status] = (acc[l.status] ?? 0) + 1; return acc;
  }, {});

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
                  <Button
                    size="sm"
                    onClick={() => {
                      const n = Number(amount);
                      if (!n || !reason.trim()) { toast.error("Amount and reason required"); return; }
                      adjust.mutate({ amount: n, description: reason.trim() });
                    }}
                    disabled={adjust.isPending}
                  >Apply</Button>
                </div>
                <p className="mt-1 text-xs text-slate-500">Positive credits, negative debits. Logged to audit trail.</p>
              </section>

              <Separator className="bg-white/10" />

              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Listings ({d?.listings.length ?? 0})</h3>
                <div className="mb-2 flex flex-wrap gap-1.5 text-xs text-slate-300">
                  {Object.entries(statusCount).map(([s, c]) => (
                    <Badge key={s} variant="outline" className="border-white/20 text-slate-200">{s}: {c}</Badge>
                  ))}
                </div>
                <div className="space-y-1 text-sm">
                  {(d?.listings ?? []).slice(0, 8).map(l => (
                    <div key={l.id} className="flex items-center justify-between gap-2 rounded-md border border-white/10 bg-white/5 px-2 py-1.5">
                      <span className="truncate">{l.title}</span>
                      <span className="shrink-0 text-xs text-slate-400">{l.status} · {format(new Date(l.created_at), "MMM d")}</span>
                    </div>
                  ))}
                  {!d?.listings.length && <div className="text-xs text-slate-500">No listings.</div>}
                </div>
              </section>

              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Wallet transactions</h3>
                <div className="space-y-1 text-sm">
                  {(d?.walletTxs ?? []).slice(0, 10).map((t: { id: string; type: string; amount_usd: number; balance_after: number; created_at: string; description: string | null }) => (
                    <div key={t.id} className="flex items-center justify-between gap-2 rounded-md border border-white/10 bg-white/5 px-2 py-1.5">
                      <span className="truncate">
                        <span className="mr-2 inline-block w-16 text-xs uppercase tracking-wider text-slate-400">{t.type}</span>
                        {t.description ?? ""}
                      </span>
                      <span className={`shrink-0 text-xs ${Number(t.amount_usd) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {Number(t.amount_usd) >= 0 ? "+" : ""}${Number(t.amount_usd).toFixed(2)}
                      </span>
                    </div>
                  ))}
                  {!d?.walletTxs.length && <div className="text-xs text-slate-500">No transactions.</div>}
                </div>
              </section>

              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Recent payments</h3>
                <div className="space-y-1 text-sm">
                  {(d?.payments ?? []).slice(0, 6).map((p: { id: string; amount: number; currency: string; status: string; promotion_type: string | null; created_at: string }) => (
                    <div key={p.id} className="flex items-center justify-between gap-2 rounded-md border border-white/10 bg-white/5 px-2 py-1.5">
                      <span className="truncate">
                        {p.promotion_type ?? "payment"} · <span className="text-xs text-slate-400">{p.status}</span>
                      </span>
                      <span className="shrink-0 text-xs text-slate-300">${Number(p.amount).toFixed(2)} {p.currency}</span>
                    </div>
                  ))}
                  {!d?.payments.length && <div className="text-xs text-slate-500">No payments.</div>}
                </div>
              </section>

              <section>
                <Label className="text-xs uppercase tracking-wider text-slate-400">Message threads</Label>
                <div className="text-sm text-slate-200">{d?.threadsCount ?? 0} threads</div>
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
