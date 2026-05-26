import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Trash2, Bell, BellOff, Search, Pencil, Check, X, BookmarkPlus, Tag, MapPin, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  listSavedSearches,
  deleteSavedSearch,
  toggleSavedSearchAlert,
  renameSavedSearch,
} from "@/lib/extras.functions";
import { PanelShell } from "@/components/PanelShell";

export const Route = createFileRoute("/_authenticated/saved-searches")({
  head: () => ({ meta: [{ title: "Saved searches — CallEscort24" }, { name: "robots", content: "noindex" }] }),
  component: Page,
});

function Page() {
  const qc = useQueryClient();
  const listFn = useServerFn(listSavedSearches);
  const delFn = useServerFn(deleteSavedSearch);
  const togFn = useServerFn(toggleSavedSearchAlert);
  const renFn = useServerFn(renameSavedSearch);
  const q = useQuery({ queryKey: ["saved-searches"], queryFn: () => listFn() });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["saved-searches"] });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); invalidate(); },
  });
  const tog = useMutation({
    mutationFn: (v: { id: string; notify: boolean }) => togFn({ data: v }),
    onSuccess: () => invalidate(),
  });
  const ren = useMutation({
    mutationFn: (v: { id: string; name: string }) => renFn({ data: v }),
    onSuccess: () => { toast.success("Renamed"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const items = q.data?.items ?? [];
  const notifyOnCount = items.filter(i => i.notify).length;

  return (
    <PanelShell
      title="Saved"
      highlight="searches"
      subtitle={`${items.length} saved · ${notifyOnCount} with alerts on`}
      action={
        <Button asChild className="btn-gradient rounded-full border-0">
          <Link to="/search"><Search className="mr-1 h-4 w-4" /> Browse listings</Link>
        </Button>
      }
    >

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {items.map((s) => (
          <SavedSearchCard
            key={s.id}
            search={s as unknown as SavedSearch}
            onToggleNotify={(notify) => tog.mutate({ id: s.id, notify })}
            onRename={(name) => ren.mutate({ id: s.id, name })}
            onDelete={() => { if (confirm("Delete this saved search?")) del.mutate(s.id); }}
          />
        ))}
      </div>

      {!items.length && (
        <div className="mt-8 rounded-3xl border border-white/40 bg-white/55 p-10 text-center shadow-[var(--shadow-float)] backdrop-blur-xl">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <BookmarkPlus className="h-7 w-7" />
          </div>
          <h2 className="mt-4 font-display text-xl font-semibold">No saved searches yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Run a search, refine the filters, then tap <strong>Save search</strong> to get notified when new listings match.
          </p>
          <Button asChild className="btn-gradient mt-5 rounded-full border-0">
            <Link to="/search"><Search className="mr-1 h-4 w-4" /> Start searching</Link>
          </Button>
        </div>
      )}
    </PanelShell>
  );
}

type SavedSearch = {
  id: string;
  name: string;
  query: string;
  filters: Record<string, unknown> | null;
  notify: boolean;
  last_notified_at: string;
  created_at: string;
};

function SavedSearchCard({
  search,
  onToggleNotify,
  onRename,
  onDelete,
}: {
  search: SavedSearch;
  onToggleNotify: (v: boolean) => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(search.name);

  const f = (search.filters ?? {}) as Record<string, string>;
  const chips: { icon: React.ReactNode; label: string }[] = [];
  if (f.category) chips.push({ icon: <Tag className="h-3 w-3" />, label: f.category });
  if (f.city) chips.push({ icon: <MapPin className="h-3 w-3" />, label: f.city });
  if (f.condition) chips.push({ icon: <SlidersHorizontal className="h-3 w-3" />, label: f.condition });
  if (f.country && !f.city) chips.push({ icon: <MapPin className="h-3 w-3" />, label: f.country });

  const commit = () => {
    const trimmed = value.trim();
    if (!trimmed || trimmed === search.name) { setEditing(false); setValue(search.name); return; }
    onRename(trimmed);
    setEditing(false);
  };

  return (
    <div className="group flex flex-col gap-3 rounded-2xl border border-white/40 bg-white/65 p-4 shadow-[var(--shadow-float)] backdrop-blur transition hover:bg-white/80">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="flex items-center gap-1.5">
              <Input
                autoFocus
                value={value}
                maxLength={80}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setEditing(false); setValue(search.name); } }}
                className="h-8 bg-white"
              />
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={commit}><Check className="h-4 w-4 text-primary" /></Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditing(false); setValue(search.name); }}><X className="h-4 w-4" /></Button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <div className="truncate font-display text-base font-semibold">{search.name}</div>
              <button onClick={() => setEditing(true)} className="opacity-0 transition group-hover:opacity-100" aria-label="Rename">
                <Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
              </button>
            </div>
          )}
          {f.q && <div className="mt-0.5 truncate text-xs text-muted-foreground">"{f.q}"</div>}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {search.notify ? <Bell className="h-3.5 w-3.5 text-primary" /> : <BellOff className="h-3.5 w-3.5" />}
          <Switch checked={search.notify} onCheckedChange={onToggleNotify} />
        </div>
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((c, i) => (
            <Badge key={i} variant="secondary" className="gap-1 rounded-full bg-white/70 capitalize">
              {c.icon}{c.label}
            </Badge>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Last checked {formatDistanceToNow(new Date(search.last_notified_at), { addSuffix: true })}</span>
        <div className="flex items-center gap-1">
          <Button asChild size="sm" variant="outline" className="h-8 rounded-full bg-white/70">
            <Link to="/search" search={f as never}><Search className="mr-1 h-3.5 w-3.5" /> Run</Link>
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onDelete} aria-label="Delete">
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      </div>
    </div>
  );
}
