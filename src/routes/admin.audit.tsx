import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { AdminPageHeader, Panel } from "@/components/admin/ui";
import { getAuditLog } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/audit")({ component: AuditPage });

function AuditPage() {
  const fn = useServerFn(getAuditLog);
  const { data } = useQuery({ queryKey: ["audit-log"], queryFn: () => fn() });
  const entries = data?.entries ?? [];
  return (
    <div>
      <AdminPageHeader title="Audit log" subtitle={`${entries.length} recent admin actions`} />
      <Panel>
        <div className="space-y-2">
          {entries.map(e => (
            <div key={e.id} className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{e.action}</Badge>
                <span className="text-slate-100">{e.actor_name ?? e.actor_id?.slice(0, 8) ?? "system"}</span>
                {e.target_type && <span className="text-slate-400">on {e.target_type}:{e.target_id?.slice(0, 8)}</span>}
                <span className="ml-auto text-xs text-slate-500">{format(new Date(e.created_at), "MMM d, HH:mm:ss")}</span>
              </div>
              {Object.keys(e.metadata as object).length > 0 && (
                <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-950/50 p-2 text-xs text-slate-400">{JSON.stringify(e.metadata, null, 2)}</pre>
              )}
            </div>
          ))}
          {!entries.length && <div className="py-10 text-center text-sm text-slate-400">No audit entries.</div>}
        </div>
      </Panel>
    </div>
  );
}
