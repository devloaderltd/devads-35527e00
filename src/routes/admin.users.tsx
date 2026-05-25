import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { AdminPageHeader, Panel } from "@/components/admin/ui";
import { listUsersAdmin, setUserRole, banUser, unbanUser, deleteUserAdmin, sendPasswordReset } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/users")({ component: UsersPage });

function UsersPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "admins" | "moderators" | "banned">("all");
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
  const del = useMutation({ mutationFn: (userId: string) => delFn({ data: { userId } }), onSuccess: () => { toast.success("Deleted"); refresh(); }, onError: (e: Error) => toast.error(e.message) });
  const reset = useMutation({ mutationFn: (email: string) => resetFn({ data: { email } }), onSuccess: () => toast.success("Reset link generated"), onError: (e: Error) => toast.error(e.message) });

  const users = usersQ.data?.users ?? [];

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
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-slate-100">{u.display_name}</span>
                    {u.banned && <Badge variant="destructive">Banned</Badge>}
                    {u.roles.map(r => <Badge key={r} variant={r === "admin" ? "default" : "secondary"} className="capitalize">{r}</Badge>)}
                  </div>
                  <div className="text-xs text-slate-400">{u.email} · ${u.wallet_balance.toFixed(2)} · joined {format(new Date(u.created_at), "MMM d, yyyy")}</div>
                </div>
                <div className="flex flex-wrap gap-1.5">
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
    </div>
  );
}
