import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Trash2, Bell, BellOff, Search } from "lucide-react";
import { toast } from "sonner";
import { listSavedSearches, deleteSavedSearch, toggleSavedSearchAlert } from "@/lib/extras.functions";

export const Route = createFileRoute("/_authenticated/saved-searches")({
  head: () => ({ meta: [{ title: "Saved searches — CallEscort24" }, { name: "robots", content: "noindex" }] }),
  component: Page,
});

function Page() {
  const qc = useQueryClient();
  const listFn = useServerFn(listSavedSearches);
  const delFn = useServerFn(deleteSavedSearch);
  const togFn = useServerFn(toggleSavedSearchAlert);
  const q = useQuery({ queryKey: ["saved-searches"], queryFn: () => listFn() });

  const del = useMutation({ mutationFn: (id: string) => delFn({ data: { id } }), onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["saved-searches"] }); } });
  const tog = useMutation({ mutationFn: (v: { id: string; notify: boolean }) => togFn({ data: v }), onSuccess: () => qc.invalidateQueries({ queryKey: ["saved-searches"] }) });

  const items = q.data?.items ?? [];
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="font-display text-2xl font-bold sm:text-3xl">Saved <span className="gradient-text">searches</span></h1>
      <p className="mt-1 text-sm text-muted-foreground">Get notified when new listings match.</p>
      <div className="mt-6 space-y-3">
        {items.map((s) => {
          const f = (s.filters ?? {}) as Record<string, string>;
          return (
            <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/40 bg-white/65 p-4 backdrop-blur shadow-[var(--shadow-float)]">
              <div className="min-w-0 flex-1">
                <div className="font-medium">{s.name}</div>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {f.q && <span>"{f.q}"</span>}
                  {f.category && <span>· {f.category}</span>}
                  {f.city && <span>· {f.city}</span>}
                  
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                {s.notify ? <Bell className="h-4 w-4 text-primary" /> : <BellOff className="h-4 w-4 text-muted-foreground" />}
                <Switch checked={s.notify} onCheckedChange={(v) => tog.mutate({ id: s.id, notify: v })} />
              </div>
              <Button asChild size="sm" variant="outline" className="rounded-full bg-white/70">
                <Link to="/search" search={f as never}><Search className="mr-1 h-3.5 w-3.5" /> Run</Link>
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { if (confirm("Delete this saved search?")) del.mutate(s.id); }}><Trash2 className="h-4 w-4 text-red-500" /></Button>
            </div>
          );
        })}
        {!items.length && <div className="rounded-2xl border bg-card p-10 text-center text-muted-foreground">No saved searches yet. Run a search and click "Save this search".</div>}
      </div>
    </div>
  );
}
