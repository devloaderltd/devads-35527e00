import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { AdminPageHeader, Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle, Cookie, RefreshCw, Trash2 } from "lucide-react";
import { getSiteSettings, updateSiteSettings } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/maintenance")({ component: MaintenancePage });

function MaintenancePage() {
  const get = useServerFn(getSiteSettings);
  const update = useServerFn(updateSiteSettings);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-settings"], queryFn: () => get() });
  const s = q.data?.settings;

  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (s) { setEnabled(!!s.maintenance_mode); setMessage(s.maintenance_message || ""); }
  }, [s]);

  const saveMut = useMutation({
    mutationFn: () => update({ data: { maintenance_mode: enabled, maintenance_message: message } }),
    onSuccess: () => { toast.success("Maintenance settings saved"); qc.invalidateQueries({ queryKey: ["admin-settings"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  // --- Cache & Cookies tools ---
  const [clearing, setClearing] = useState(false);
  const [signOut, setSignOut] = useState(true);

  async function clearLocalCachesAndCookies() {
    setClearing(true);
    try {
      // 1. Query cache
      qc.clear();

      // 2. localStorage / sessionStorage
      try { localStorage.clear(); } catch {}
      try { sessionStorage.clear(); } catch {}

      // 3. Cookies for this origin (best-effort; httpOnly cookies stay)
      try {
        const cookies = document.cookie.split(";");
        const host = window.location.hostname;
        const domains = [host, "." + host, host.replace(/^www\./, ""), "." + host.replace(/^www\./, "")];
        for (const c of cookies) {
          const name = c.split("=")[0]?.trim();
          if (!name) continue;
          for (const path of ["/", window.location.pathname]) {
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}`;
            for (const d of domains) {
              document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}; domain=${d}`;
            }
          }
        }
      } catch {}

      // 4. Cache Storage API (service worker caches)
      try {
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
      } catch {}

      // 5. IndexedDB databases (Supabase auth, etc.)
      try {
        const anyIDB = indexedDB as any;
        if (anyIDB?.databases) {
          const dbs: Array<{ name?: string }> = await anyIDB.databases();
          await Promise.all(
            dbs
              .filter((db) => db.name)
              .map((db) => new Promise<void>((resolve) => {
                const req = indexedDB.deleteDatabase(db.name!);
                req.onsuccess = req.onerror = req.onblocked = () => resolve();
              })),
          );
        }
      } catch {}

      // 6. Unregister service workers
      try {
        if ("serviceWorker" in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map((r) => r.unregister()));
        }
      } catch {}

      if (signOut) {
        try { await supabase.auth.signOut(); } catch {}
      }

      toast.success("Local cache, cookies & service workers cleared");
      setTimeout(() => window.location.reload(), 600);
    } finally {
      setClearing(false);
    }
  }

  function purgeServerCaches() {
    qc.invalidateQueries();
    toast.success("All client queries invalidated — fresh data on next request");
  }

  return (
    <div>
      <AdminPageHeader title="Maintenance" subtitle="Take the site offline for non-admin users and manage local caches" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Maintenance mode" actions={enabled ? <AlertTriangle className="h-4 w-4 text-amber-400" /> : null}>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3">
              <div>
                <div className="text-sm font-medium text-slate-100">Enable maintenance mode</div>
                <p className="text-xs text-slate-400">Only admins can access the site while this is on.</p>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>
            <div>
              <Label className="text-xs text-slate-400">Message shown to visitors</Label>
              <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} className="border-white/10 bg-slate-900/50 text-slate-100 placeholder:text-slate-500" />
            </div>
            <Button className="w-full rounded-full border-0 bg-gradient-to-r from-indigo-500 to-fuchsia-500" disabled={saveMut.isPending} onClick={() => saveMut.mutate()}>
              {saveMut.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </Panel>

        <Panel title="Cache & cookies" actions={<Cookie className="h-4 w-4 text-slate-400" />}>
          <div className="space-y-3">
            <p className="text-xs text-slate-400">
              Use these tools when the admin UI is showing stale data, after a deployment, or when
              debugging session issues. The first action clears storage on <em>your</em> browser
              only.
            </p>

            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3">
              <div>
                <div className="text-sm font-medium text-slate-100">Sign out after clearing</div>
                <p className="text-xs text-slate-400">Recommended — your auth tokens are stored locally.</p>
              </div>
              <Switch checked={signOut} onCheckedChange={setSignOut} />
            </div>

            <Button
              variant="destructive"
              className="w-full rounded-full"
              disabled={clearing}
              onClick={clearLocalCachesAndCookies}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {clearing ? "Clearing…" : "Clear my browser cache, cookies & storage"}
            </Button>

            <Button
              variant="secondary"
              className="w-full rounded-full"
              onClick={purgeServerCaches}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Invalidate all query caches
            </Button>

            <p className="text-[11px] leading-relaxed text-slate-500">
              Clears localStorage, sessionStorage, IndexedDB, Cache Storage, Service Workers, and
              non-HttpOnly cookies for this domain, then reloads the page. HttpOnly cookies (if
              any) are removed by the server only on sign-out.
            </p>
          </div>
        </Panel>
      </div>
    </div>
  );
}
