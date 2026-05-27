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
import { AlertTriangle, Upload, X, Copy, ExternalLink, Check, ChevronDown } from "lucide-react";
import { AdminPageHeader, Panel } from "@/components/admin/ui";
import { getSiteSettings, updateSiteSettings } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_PROJECT_REF = "jxvrfmekootjojxfovli";
const GOOGLE_REDIRECT_URI = `https://${SUPABASE_PROJECT_REF}.supabase.co/auth/v1/callback`;
const GOOGLE_AUTHORIZED_ORIGINS = [
  "https://callescort24.org",
  "https://www.callescort24.org",
  "https://devads.lovable.app",
  "https://id-preview--4e817e8c-6b6f-4c13-a579-a3b9b7d44ed7.lovable.app",
].join("\n");
const BACKEND_GOOGLE_PROVIDER_URL = `https://supabase.com/dashboard/project/${SUPABASE_PROJECT_REF}/auth/providers?provider=Google`;
const GOOGLE_CLOUD_CREDENTIALS_URL = "https://console.cloud.google.com/apis/credentials";

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
                thumbSize="logo"
                value={form.logo_url}
                onChange={(v) => set("logo_url", v)}
                maxBytes={1024 * 1024}
                maxLabel="≤ 1 MB"
                hint="PNG, SVG or WebP"
              />
              <AssetUploader
                label="Favicon"
                kind="favicon"
                thumbSize="favicon"
                value={form.favicon_url}
                onChange={(v) => set("favicon_url", v)}
                maxBytes={256 * 1024}
                maxLabel="≤ 256 KB"
                hint="ICO, PNG or SVG"
              />
            </div>
          </div>
        </Panel>

        <GoogleAuthPanel />





        <Panel title="Promotion pricing">
          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 [&>*]:min-w-0">
            <Field label="Featured price" hint="0 – 9999" error={errors.featured_price_usd}>
              <NumberInput suffix="USD" step="0.01" min={0} max={9999} value={form.featured_price_usd} onChange={(n) => set("featured_price_usd", n)} />
            </Field>
            <Field label="Featured days" hint="1 – 365" error={errors.featured_days}>
              <NumberInput suffix="days" min={1} max={365} value={form.featured_days} onChange={(n) => set("featured_days", n)} />
            </Field>
            <Field label="Bump price" hint="0 – 9999" error={errors.bump_price_usd}>
              <NumberInput suffix="USD" step="0.01" min={0} max={9999} value={form.bump_price_usd} onChange={(n) => set("bump_price_usd", n)} />
            </Field>
            <Field label="Bump cooldown" hint="1 – 365" error={errors.bump_days}>
              <NumberInput suffix="days" min={1} max={365} value={form.bump_days} onChange={(n) => set("bump_days", n)} />
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
            <div className="mt-4 rounded-2xl border border-amber-400/40 bg-amber-500/10 p-4" data-vr-mask>
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


function Field({ label, hint, error, className, children }: { label: string; hint?: string; error?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-2">
        <Label className="text-xs text-slate-300 sm:text-sm">{label}</Label>
        {hint && <span className="text-[10px] tabular-nums text-slate-500">{hint}</span>}
      </div>
      {children}
      {error && <p className="mt-1 break-words text-xs leading-snug text-red-400">{error}</p>}
    </div>
  );
}

function NumberInput({
  value, onChange, suffix, min, max, step,
}: {
  value: number;
  onChange: (n: number) => void;
  suffix?: string;
  min?: number;
  max?: number;
  step?: string | number;
}) {
  return (
    <div className="relative mt-1">
      <Input
        type="number"
        inputMode="decimal"
        step={step}
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`w-full rounded-lg border-white/10 bg-white/5 text-sm tabular-nums text-slate-100 ${suffix ? "pr-14" : ""}`}
      />
      {suffix && (
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 select-none text-[11px] uppercase tracking-wider text-slate-500">
          {suffix}
        </span>
      )}
    </div>
  );
}

function AssetUploader({
  label, kind, thumbSize, value, onChange, maxBytes, maxLabel, hint,
}: {
  label: string;
  kind: "logo" | "favicon";
  thumbSize: "logo" | "favicon";
  value: string;
  onChange: (v: string) => void;
  maxBytes: number;
  maxLabel: string;
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

  // Standardized outer slot: always 64×64 so logo and favicon rows align.
  // Inner preview is sized by thumbSize so the favicon doesn't visually dominate.
  const innerThumb = thumbSize === "logo" ? "h-14 w-14" : "h-10 w-10";

  return (
    <div className="w-full min-w-0">
      <div className="flex items-center justify-between gap-2">
        <Label className="block truncate text-xs text-slate-300 sm:text-sm">{label}</Label>
        <span className="shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wider text-slate-400">{maxLabel}</span>
      </div>
      <div className="mt-1 flex min-w-0 items-start gap-3 rounded-lg border border-white/10 bg-white/5 p-2.5">
        <div className="grid h-16 w-16 flex-shrink-0 place-items-center overflow-hidden rounded-md bg-slate-950/40">
          {value ? (
            <div className={`grid ${innerThumb} place-items-center`}>
              <img src={value} alt={label} className="h-full w-full object-contain" />
            </div>
          ) : (
            <span className="text-[10px] text-slate-500">None</span>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
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
          <p className="line-clamp-2 break-words text-[11px] leading-snug text-slate-500">{hint}</p>
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

function CopyField({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`${label} copied`);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      toast.error("Clipboard unavailable");
    }
  };
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <Label className="text-xs text-slate-300 sm:text-sm">{label}</Label>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={copy}
          className="h-7 rounded-full px-2 text-xs text-slate-300 hover:bg-white/10 hover:text-slate-100"
        >
          {copied ? <Check className="mr-1 h-3 w-3" /> : <Copy className="mr-1 h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      {multiline ? (
        <Textarea
          readOnly
          value={value}
          rows={4}
          className="rounded-lg border-white/10 bg-slate-950/40 font-mono text-xs text-slate-200"
          onFocus={(e) => e.currentTarget.select()}
        />
      ) : (
        <Input
          readOnly
          value={value}
          className="rounded-lg border-white/10 bg-slate-950/40 font-mono text-xs text-slate-200"
          onFocus={(e) => e.currentTarget.select()}
        />
      )}
    </div>
  );
}

function GoogleAuthPanel() {
  const [openChecklist, setOpenChecklist] = useState(false);
  return (
    <Panel title="Google sign-in (branded)" className="lg:col-span-2">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <p className="text-sm text-slate-300">
            Branded Google sign-in shows <span className="font-semibold text-slate-100">CallEscort24</span> on the Google
            consent screen instead of a generic app name. Use your own Google Cloud OAuth credentials.
          </p>
          <p className="text-xs text-slate-500">
            Client ID and Client Secret are stored in the backend authentication panel — not in the site database — so they
            must be pasted there directly. The two fields below are the values you'll need to paste into Google Cloud Console.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <CopyField label="Authorized redirect URI" value={GOOGLE_REDIRECT_URI} />
          <CopyField label="Authorized JavaScript origins" value={GOOGLE_AUTHORIZED_ORIGINS} multiline />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            className="rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white"
            onClick={() => window.dispatchEvent(new CustomEvent("lov-open-backend"))}
          >
            Open backend → Users → Auth Settings <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
          </Button>
          <Button
            asChild
            variant="outline"
            className="rounded-full border-white/15 bg-white/5 text-slate-100 hover:bg-white/10"
          >
            <a href={GOOGLE_CLOUD_CREDENTIALS_URL} target="_blank" rel="noopener noreferrer">
              Google Cloud Console — Credentials <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
            </a>
          </Button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5">
          <button
            type="button"
            onClick={() => setOpenChecklist((v) => !v)}
            className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-slate-100"
          >
            <span>Setup checklist</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${openChecklist ? "rotate-180" : ""}`} />
          </button>
          {openChecklist && (
            <ol className="space-y-2 border-t border-white/10 px-5 py-4 text-sm text-slate-300 [counter-reset:step] [&>li]:relative [&>li]:pl-7 [&>li]:before:absolute [&>li]:before:left-0 [&>li]:before:top-0 [&>li]:before:flex [&>li]:before:h-5 [&>li]:before:w-5 [&>li]:before:items-center [&>li]:before:justify-center [&>li]:before:rounded-full [&>li]:before:bg-indigo-500/20 [&>li]:before:text-[10px] [&>li]:before:font-semibold [&>li]:before:text-indigo-200 [&>li]:before:[counter-increment:step] [&>li]:before:[content:counter(step)]">
              <li>Create a project in Google Cloud Console (name it CallEscort24).</li>
              <li>Open <span className="font-medium text-slate-100">APIs &amp; Services → OAuth consent screen</span>. Pick <span className="font-medium">External</span>, set the app name, support email, and add <span className="font-mono text-xs">callescort24.org</span> as an authorized domain. Add scopes: <span className="font-mono text-xs">userinfo.email</span>, <span className="font-mono text-xs">userinfo.profile</span>, <span className="font-mono text-xs">openid</span>.</li>
              <li>Open <span className="font-medium text-slate-100">Credentials → Create credentials → OAuth client ID</span>. Type: <span className="font-medium">Web application</span>.</li>
              <li>Paste the <span className="font-medium">Authorized JavaScript origins</span> and the <span className="font-medium">Authorized redirect URI</span> from the fields above.</li>
              <li>Copy the generated <span className="font-medium">Client ID</span> and <span className="font-medium">Client Secret</span>.</li>
              <li>Click <span className="font-medium">Open Google provider settings</span> above, enable Google, paste the Client ID and Secret, and save.</li>
            </ol>
          )}
        </div>
      </div>
    </Panel>
  );
}



