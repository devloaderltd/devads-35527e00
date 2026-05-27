import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { AlertTriangle, Upload, X } from "lucide-react";
import { AdminPageHeader, Panel } from "@/components/admin/ui";
import { getSiteSettings, updateSiteSettings } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/settings")({ component: SettingsPage });

type FormState = {
  featured_price_usd: number;
  bump_price_usd: number;
  featured_days: number;
  bump_days: number;
  maintenance_mode: boolean;
  maintenance_message: string;
  site_name: string;
  support_email: string;
  logo_url: string;
  favicon_url: string;
};

function validate(f: FormState) {
  const e: Partial<Record<keyof FormState, string>> = {};
  if (!(f.featured_price_usd >= 0 && f.featured_price_usd <= 9999)) e.featured_price_usd = "0 – 9999";
  if (!(f.bump_price_usd >= 0 && f.bump_price_usd <= 9999)) e.bump_price_usd = "0 – 9999";
  if (!Number.isInteger(f.featured_days) || f.featured_days < 1 || f.featured_days > 365) e.featured_days = "1 – 365 days";
  if (!Number.isInteger(f.bump_days) || f.bump_days < 1 || f.bump_days > 365) e.bump_days = "1 – 365 days";
  if (!f.site_name.trim() || f.site_name.length > 80) e.site_name = "1 – 80 chars";
  if (f.support_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.support_email)) e.support_email = "Invalid email";
  if (f.support_email.length > 120) e.support_email = "≤ 120 chars";
  if (f.maintenance_message.length > 500) e.maintenance_message = "≤ 500 chars";
  return e;
}

function SettingsPage() {
  const qc = useQueryClient();
  const getFn = useServerFn(getSiteSettings);
  const updateFn = useServerFn(updateSiteSettings);
  const { data, isLoading } = useQuery({ queryKey: ["site-settings"], queryFn: () => getFn() });
  const s = data?.settings;

  const initial: FormState | null = useMemo(() => s ? {
    featured_price_usd: Number(s.featured_price_usd),
    bump_price_usd: Number(s.bump_price_usd),
    featured_days: s.featured_days,
    bump_days: s.bump_days,
    maintenance_mode: s.maintenance_mode,
    maintenance_message: s.maintenance_message,
    site_name: s.site_name,
    support_email: s.support_email,
    logo_url: (s as any).logo_url ?? "",
    favicon_url: (s as any).favicon_url ?? "",
  } : null, [s]);

  const [form, setForm] = useState<FormState | null>(null);
  const [confirmText, setConfirmText] = useState("");
  useEffect(() => { if (initial) { setForm(initial); setConfirmText(""); } }, [initial]);

  const errors = form ? validate(form) : {};
  const hasErrors = Object.keys(errors).length > 0;
  const dirty = !!(form && initial && JSON.stringify(form) !== JSON.stringify(initial));
  const enablingMaintenance = !!(form && initial && form.maintenance_mode && !initial.maintenance_mode);
  const maintenanceBlocked = enablingMaintenance && confirmText !== "ENABLE";

  const save = useMutation({
    mutationFn: () => updateFn({ data: form as FormState }),
    onSuccess: () => {
      toast.success("Settings published");
      qc.invalidateQueries({ queryKey: ["site-settings"] });
      qc.invalidateQueries({ queryKey: ["site-settings-public"] });
      qc.invalidateQueries({ queryKey: ["promotion-pricing"] });
      setConfirmText("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => f ? { ...f, [k]: v } : f);

  const onSave = () => {
    if (!form) return;
    if (hasErrors) { toast.error("Fix validation errors first"); return; }
    if (maintenanceBlocked) { toast.error('Type "ENABLE" to confirm maintenance mode'); return; }
    save.mutate();
  };

  if (isLoading || !form) {
    return <div className="py-10 text-center text-sm text-slate-400">Loading settings…</div>;
  }

  return (
    <div>
      <AdminPageHeader
        title="Site settings"
        subtitle={dirty ? "Unsaved changes" : "All changes published"}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" disabled={!dirty || save.isPending} onClick={() => { setForm(initial); setConfirmText(""); }} className="rounded-full">Discard</Button>
            <Button
              onClick={onSave}
              disabled={!dirty || hasErrors || maintenanceBlocked || save.isPending}
              className="rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white"
            >
              {save.isPending ? "Publishing…" : "Publish changes"}
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        <Panel title="Branding">
          <div className="space-y-3">
            <Field label="Site name" error={errors.site_name}>
              <Input value={form.site_name} onChange={(e) => set("site_name", e.target.value)} className="mt-1 rounded-lg border-white/10 bg-white/5 text-slate-100" maxLength={80} />
            </Field>
            <Field label="Support email" error={errors.support_email}>
              <Input type="email" value={form.support_email} onChange={(e) => set("support_email", e.target.value)} className="mt-1 rounded-lg border-white/10 bg-white/5 text-slate-100" maxLength={120} />
            </Field>
            <div className="grid min-w-0 grid-cols-1 gap-3 pt-2 sm:grid-cols-2 sm:gap-4 [&>*]:min-w-0">
              <AssetUploader
                label="Logo"
                kind="logo"
                value={form.logo_url}
                onChange={(v) => set("logo_url", v)}
                maxBytes={1024 * 1024}
                hint="PNG/SVG/WebP, ≤ 1 MB"
              />
              <AssetUploader
                label="Favicon"
                kind="favicon"
                value={form.favicon_url}
                onChange={(v) => set("favicon_url", v)}
                maxBytes={256 * 1024}
                hint="ICO/PNG/SVG, ≤ 256 KB"
              />
            </div>
          </div>
        </Panel>



        <Panel title="Promotion pricing">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Featured price (USD)" error={errors.featured_price_usd}>
              <Input type="number" step="0.01" min={0} max={9999} value={form.featured_price_usd} onChange={(e) => set("featured_price_usd", Number(e.target.value))} className="mt-1 rounded-lg border-white/10 bg-white/5 text-slate-100" />
            </Field>
            <Field label="Featured days" error={errors.featured_days}>
              <Input type="number" min={1} max={365} value={form.featured_days} onChange={(e) => set("featured_days", Number(e.target.value))} className="mt-1 rounded-lg border-white/10 bg-white/5 text-slate-100" />
            </Field>
            <Field label="Bump price (USD)" error={errors.bump_price_usd}>
              <Input type="number" step="0.01" min={0} max={9999} value={form.bump_price_usd} onChange={(e) => set("bump_price_usd", Number(e.target.value))} className="mt-1 rounded-lg border-white/10 bg-white/5 text-slate-100" />
            </Field>
            <Field label="Bump cooldown days" error={errors.bump_days}>
              <Input type="number" min={1} max={365} value={form.bump_days} onChange={(e) => set("bump_days", Number(e.target.value))} className="mt-1 rounded-lg border-white/10 bg-white/5 text-slate-100" />
            </Field>
          </div>
        </Panel>

        <Panel title="Maintenance mode" className="lg:col-span-2">
          <div className="flex items-center gap-3">
            <Switch checked={form.maintenance_mode} onCheckedChange={(v) => set("maintenance_mode", v)} />
            <Label className="text-slate-300">Take the site offline for non-admins</Label>
          </div>
          <Field label="Message shown to users" error={errors.maintenance_message} className="mt-3">
            <Textarea value={form.maintenance_message} onChange={(e) => set("maintenance_message", e.target.value)} className="rounded-lg border-white/10 bg-white/5 text-slate-100" rows={3} maxLength={500} />
          </Field>

          {form.maintenance_mode && (
            <div className="mt-4 rounded-2xl border border-amber-400/40 bg-amber-500/10 p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-200">
                <AlertTriangle className="h-3.5 w-3.5" /> Preview
              </div>
              <div className="rounded-xl bg-slate-950/50 p-4 text-center">
                <div className="font-display text-lg font-bold text-slate-100">{form.site_name || "Site"}</div>
                <p className="mt-1 text-sm text-slate-400">{form.maintenance_message || "We are performing maintenance."}</p>
                {form.support_email && <p className="mt-2 text-xs text-slate-500">{form.support_email}</p>}
              </div>
            </div>
          )}

          {enablingMaintenance && (
            <div className="mt-4 rounded-2xl border border-red-400/40 bg-red-500/10 p-4">
              <p className="text-sm text-red-100">You're about to take the site offline for all non-admins. Type <span className="font-mono font-bold">ENABLE</span> below to confirm.</p>
              <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="ENABLE" className="mt-2 rounded-lg border-white/10 bg-white/5 text-slate-100" />
            </div>
          )}
        </Panel>

        <Panel title="Utilities" className="lg:col-span-2">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="rounded-full border-white/15 bg-white/5 text-slate-100 hover:bg-white/10"
              onClick={() => {
                const json = JSON.stringify(form, null, 2);
                navigator.clipboard.writeText(json).then(
                  () => toast.success("Site config copied to clipboard"),
                  () => toast.error("Clipboard unavailable"),
                );
              }}
            >
              Copy site config as JSON
            </Button>
            <Button
              variant="outline"
              className="rounded-full border-white/15 bg-white/5 text-slate-100 hover:bg-white/10"
              onClick={() => {
                const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), settings: form }, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url; a.download = `site-config-${new Date().toISOString().slice(0, 10)}.json`; a.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              }}
            >
              Download config
            </Button>
          </div>
          <p className="mt-2 text-xs text-slate-500">Useful for backups, sharing config across environments, or pasting into a support ticket.</p>
        </Panel>
      </div>
    </div>
  );
}


function Field({ label, error, className, children }: { label: string; error?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <Label className="text-xs text-slate-300 sm:text-sm">{label}</Label>
      {children}
      {error && <p className="mt-1 break-words text-xs text-red-400">{error}</p>}
    </div>
  );
}

function AssetUploader({
  label, kind, value, onChange, maxBytes, hint,
}: {
  label: string;
  kind: "logo" | "favicon";
  value: string;
  onChange: (v: string) => void;
  maxBytes: number;
  hint: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const onPick = async (file: File) => {
    if (file.size > maxBytes) {
      toast.error(`File too large (max ${Math.round(maxBytes / 1024)} KB)`);
      return;
    }
    if (!/^image\//.test(file.type) && !file.name.endsWith(".ico")) {
      toast.error("Image files only");
      return;
    }
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `${kind}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("branding").upload(path, file, {
        cacheControl: "3600", upsert: false, contentType: file.type || undefined,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("branding").getPublicUrl(path);
      onChange(data.publicUrl);
      toast.success(`${label} uploaded — remember to publish`);
    } catch (e) {
      toast.error((e as Error).message || "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="w-full min-w-0">
      <Label className="block truncate text-xs text-slate-300 sm:text-sm">{label}</Label>
      <div className="mt-1 flex min-w-0 items-start gap-2 rounded-lg border border-white/10 bg-white/5 p-2">
        <div className="grid h-14 w-14 flex-shrink-0 place-items-center overflow-hidden rounded-md bg-slate-950/40">
          {value ? (
            <img src={value} alt={label} className="h-full w-full object-contain" />
          ) : (
            <span className="text-[10px] text-slate-500">None</span>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-full border-white/15 bg-white/5 text-xs text-slate-100 hover:bg-white/10"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="mr-1 h-3 w-3" />
              {uploading ? "Uploading…" : value ? "Replace" : "Upload"}
            </Button>
            {value && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="rounded-full text-xs text-slate-400 hover:text-red-300"
                onClick={() => onChange("")}
              >
                <X className="mr-1 h-3 w-3" /> Remove
              </Button>
            )}
          </div>
          <p className="break-words text-[11px] leading-snug text-slate-500">{hint}</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp,image/x-icon,.ico"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); }}
        />
      </div>
    </div>
  );
}

