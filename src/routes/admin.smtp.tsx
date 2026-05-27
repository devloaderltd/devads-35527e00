import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Mail, Send, CheckCircle2, XCircle, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AdminPageHeader, Panel } from "@/components/admin/ui";
import {
  getSmtpSettings, updateSmtpSettings, toggleSmtp, testSmtpConnection,
} from "@/lib/smtp/settings.functions";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/admin/smtp")({ component: SmtpPage });

const MASK = "••••••••";

type FormState = {
  enabled: boolean;
  provider_label: string;
  host: string;
  port: number;
  secure: boolean;
  auth_user: string;
  auth_pass: string;
  from_email: string;
  from_name: string;
  reply_to: string;
};

const EMPTY: FormState = {
  enabled: false,
  provider_label: "",
  host: "",
  port: 587,
  secure: false,
  auth_user: "",
  auth_pass: "",
  from_email: "",
  from_name: "",
  reply_to: "",
};

const PRESETS: { label: string; host: string; port: number; secure: boolean }[] = [
  { label: "SendGrid", host: "smtp.sendgrid.net", port: 587, secure: false },
  { label: "Mailgun", host: "smtp.mailgun.org", port: 587, secure: false },
  { label: "Brevo (Sendinblue)", host: "smtp-relay.brevo.com", port: 587, secure: false },
  { label: "Gmail", host: "smtp.gmail.com", port: 587, secure: false },
  { label: "Generic SSL (465)", host: "", port: 465, secure: true },
];

function SmtpPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const getFn = useServerFn(getSmtpSettings);
  const updateFn = useServerFn(updateSmtpSettings);
  const toggleFn = useServerFn(toggleSmtp);
  const testFn = useServerFn(testSmtpConnection);

  const { data, isLoading } = useQuery({
    queryKey: ["smtp-settings"],
    queryFn: () => getFn(),
  });
  const s = data?.settings;

  const initial: FormState = useMemo(() => {
    if (!s) return EMPTY;
    return {
      enabled: !!s.enabled,
      provider_label: s.provider_label ?? "",
      host: s.host ?? "",
      port: s.port ?? 587,
      secure: !!s.secure,
      auth_user: s.auth_user ?? "",
      auth_pass: s.auth_pass ?? "",
      from_email: s.from_email ?? "",
      from_name: s.from_name ?? "",
      reply_to: s.reply_to ?? "",
    };
  }, [s]);

  const [form, setForm] = useState<FormState>(EMPTY);
  const [testTo, setTestTo] = useState("");

  useEffect(() => {
    setForm(initial);
    if (user?.email && !testTo) setTestTo(user.email);
  }, [initial, user?.email]);

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const save = useMutation({
    mutationFn: () =>
      updateFn({
        data: {
          ...form,
          reply_to: form.reply_to || null,
        } as any,
      }),
    onSuccess: () => {
      toast.success("SMTP settings saved");
      qc.invalidateQueries({ queryKey: ["smtp-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleM = useMutation({
    mutationFn: (enabled: boolean) => toggleFn({ data: { enabled } }),
    onSuccess: (_d, enabled) => {
      toast.success(enabled ? "SMTP enabled" : "SMTP disabled (using Lovable queue)");
      qc.invalidateQueries({ queryKey: ["smtp-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const test = useMutation({
    mutationFn: () => testFn({ data: { to: testTo } }),
    onSuccess: (r: any) => {
      if (r.ok) toast.success(`Test email sent in ${r.durationMs}ms`);
      else toast.error(`Test failed: ${r.error}`);
      qc.invalidateQueries({ queryKey: ["smtp-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const applyPreset = (label: string) => {
    const p = PRESETS.find((x) => x.label === label);
    if (!p) return;
    setForm((f) => ({
      ...f,
      provider_label: p.label,
      host: p.host || f.host,
      port: p.port,
      secure: p.secure,
    }));
  };

  if (isLoading) {
    return <div className="py-10 text-center text-sm text-slate-400">Loading SMTP settings…</div>;
  }

  const status = s?.enabled
    ? { label: "Enabled", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30" }
    : { label: "Disabled", cls: "bg-slate-500/15 text-slate-300 border-slate-400/30" };

  const lastTest = s?.last_test_at
    ? new Date(s.last_test_at as string).toLocaleString()
    : null;

  return (
    <div>
      <AdminPageHeader
        title="SMTP delivery"
        subtitle="Configure third-party SMTP. When enabled, all queued emails are sent via this server."
        actions={
          <div className="flex items-center gap-3">
            <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${status.cls}`}>
              {status.label}
            </span>
            <Switch
              checked={!!s?.enabled}
              onCheckedChange={(v) => toggleM.mutate(v)}
              disabled={toggleM.isPending}
            />
          </div>
        }
      />

      <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        <Panel title="Server" className="lg:col-span-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs text-slate-300">Provider preset</Label>
              <Select onValueChange={applyPreset}>
                <SelectTrigger className="mt-1 rounded-lg border-white/10 bg-white/5 text-slate-100">
                  <SelectValue placeholder="Choose preset (optional)…" />
                </SelectTrigger>
                <SelectContent>
                  {PRESETS.map((p) => (
                    <SelectItem key={p.label} value={p.label}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-slate-300">Provider label (informational)</Label>
              <Input
                value={form.provider_label}
                onChange={(e) => set("provider_label", e.target.value)}
                className="mt-1 rounded-lg border-white/10 bg-white/5 text-slate-100"
                placeholder="e.g. SendGrid"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-300">Host</Label>
              <Input
                value={form.host}
                onChange={(e) => set("host", e.target.value)}
                className="mt-1 rounded-lg border-white/10 bg-white/5 text-slate-100"
                placeholder="smtp.example.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-300">Port</Label>
                <Input
                  type="number"
                  value={form.port}
                  onChange={(e) => set("port", Number(e.target.value))}
                  className="mt-1 rounded-lg border-white/10 bg-white/5 text-slate-100"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-300">Secure (TLS/SSL)</Label>
                <div className="mt-2 flex items-center gap-2">
                  <Switch checked={form.secure} onCheckedChange={(v) => set("secure", v)} />
                  <span className="text-xs text-slate-400">
                    {form.secure ? "SSL (465)" : "STARTTLS (587)"}
                  </span>
                </div>
              </div>
            </div>
            <div>
              <Label className="text-xs text-slate-300">SMTP username</Label>
              <Input
                value={form.auth_user}
                onChange={(e) => set("auth_user", e.target.value)}
                className="mt-1 rounded-lg border-white/10 bg-white/5 text-slate-100"
                autoComplete="off"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-300">SMTP password / API key</Label>
              <Input
                type="password"
                value={form.auth_pass}
                onChange={(e) => set("auth_pass", e.target.value)}
                className="mt-1 rounded-lg border-white/10 bg-white/5 text-slate-100"
                placeholder={s?.auth_pass ? MASK : "Enter password"}
                autoComplete="new-password"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Leave as is to keep the existing password. Stored encrypted at rest.
              </p>
            </div>
          </div>
        </Panel>

        <Panel title="From address" className="lg:col-span-2">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label className="text-xs text-slate-300">From email</Label>
              <Input
                type="email"
                value={form.from_email}
                onChange={(e) => set("from_email", e.target.value)}
                className="mt-1 rounded-lg border-white/10 bg-white/5 text-slate-100"
                placeholder="noreply@yourdomain.com"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-300">From name</Label>
              <Input
                value={form.from_name}
                onChange={(e) => set("from_name", e.target.value)}
                className="mt-1 rounded-lg border-white/10 bg-white/5 text-slate-100"
                placeholder="CallEscort24"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-300">Reply-to (optional)</Label>
              <Input
                type="email"
                value={form.reply_to}
                onChange={(e) => set("reply_to", e.target.value)}
                className="mt-1 rounded-lg border-white/10 bg-white/5 text-slate-100"
                placeholder="support@yourdomain.com"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setForm(initial)}
              disabled={!dirty || save.isPending}
              className="rounded-full"
            >
              Discard
            </Button>
            <Button
              onClick={() => save.mutate()}
              disabled={!dirty || save.isPending}
              className="rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white"
            >
              {save.isPending ? "Saving…" : "Save settings"}
            </Button>
          </div>
        </Panel>

        <Panel title="Test send" className="lg:col-span-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Label className="text-xs text-slate-300">Send a test email to</Label>
              <Input
                type="email"
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
                className="mt-1 rounded-lg border-white/10 bg-white/5 text-slate-100"
                placeholder="you@example.com"
              />
            </div>
            <Button
              onClick={() => test.mutate()}
              disabled={!testTo || test.isPending}
              className="rounded-full"
            >
              <Send className="mr-2 h-4 w-4" />
              {test.isPending ? "Sending…" : "Send test"}
            </Button>
          </div>

          {lastTest && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-white/10 bg-white/5 p-3 text-sm">
              {s?.last_test_status === "ok" ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-400" />
              ) : (
                <XCircle className="mt-0.5 h-4 w-4 text-rose-400" />
              )}
              <div className="flex-1 text-slate-300">
                <div className="font-medium">
                  Last test: {s?.last_test_status === "ok" ? "Success" : "Failed"}
                </div>
                <div className="text-xs text-slate-500">{lastTest}</div>
                {s?.last_test_error && (
                  <div className="mt-1 break-words font-mono text-xs text-rose-300">
                    {s.last_test_error}
                  </div>
                )}
              </div>
            </div>
          )}
        </Panel>

        <Panel title="Common presets" className="lg:col-span-2">
          <div className="grid gap-2 text-xs text-slate-400 sm:grid-cols-2">
            <div className="flex items-start gap-2"><Server className="mt-0.5 h-3.5 w-3.5" /> SendGrid — host <code className="text-slate-200">smtp.sendgrid.net</code>, port 587, STARTTLS, user <code className="text-slate-200">apikey</code>, password = API key.</div>
            <div className="flex items-start gap-2"><Server className="mt-0.5 h-3.5 w-3.5" /> Mailgun — host <code className="text-slate-200">smtp.mailgun.org</code>, port 587, STARTTLS.</div>
            <div className="flex items-start gap-2"><Server className="mt-0.5 h-3.5 w-3.5" /> Brevo — host <code className="text-slate-200">smtp-relay.brevo.com</code>, port 587, STARTTLS.</div>
            <div className="flex items-start gap-2"><Server className="mt-0.5 h-3.5 w-3.5" /> Gmail — host <code className="text-slate-200">smtp.gmail.com</code>, port 587, STARTTLS, requires app password.</div>
            <div className="flex items-start gap-2"><Mail className="mt-0.5 h-3.5 w-3.5" /> Generic SSL — port 465, Secure ON.</div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
