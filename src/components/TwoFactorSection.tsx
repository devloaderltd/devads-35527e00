import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Smartphone } from "lucide-react";
import { toast } from "sonner";

type Factor = { id: string; friendly_name?: string | null; factor_type: string; status: string };

export function TwoFactorSection() {
  const [factors, setFactors] = useState<Factor[]>([]);
  const [enrolling, setEnrolling] = useState<null | { factorId: string; qr: string; secret: string }>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors((data?.totp ?? []) as Factor[]);
  };

  useEffect(() => { refresh(); }, []);

  const verified = factors.some(f => f.status === "verified");

  const startEnroll = async () => {
    setBusy(true);
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
    setBusy(false);
    if (error) return toast.error(error.message);
    setEnrolling({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  };

  const verify = async () => {
    if (!enrolling) return;
    setBusy(true);
    const { data: chal } = await supabase.auth.mfa.challenge({ factorId: enrolling.factorId });
    if (!chal) { setBusy(false); return; }
    const { error } = await supabase.auth.mfa.verify({
      factorId: enrolling.factorId,
      challengeId: chal.id,
      code,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Two-factor enabled");
    setEnrolling(null);
    setCode("");
    refresh();
  };

  const unenroll = async (factorId: string) => {
    if (!confirm("Remove two-factor authentication?")) return;
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) return toast.error(error.message);
    toast.success("Two-factor disabled");
    refresh();
  };

  return (
    <section className="mt-5 border-t border-white/40 pt-5">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Smartphone className="h-3.5 w-3.5" /> Two-factor authentication
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm">
          <div className="flex items-center gap-2 font-medium">
            Authenticator app
            {verified ? (
              <Badge className="gap-1 rounded-full bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                <ShieldCheck className="h-3 w-3" /> On
              </Badge>
            ) : (
              <Badge variant="outline" className="rounded-full">Off</Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground">Use Google Authenticator, 1Password, or any TOTP app.</div>
        </div>
        {verified ? (
          <Button variant="outline" className="rounded-full bg-white/60" onClick={() => unenroll(factors.find(f => f.status === "verified")!.id)}>
            Disable 2FA
          </Button>
        ) : !enrolling ? (
          <Button variant="outline" className="rounded-full bg-white/60" disabled={busy} onClick={startEnroll}>
            {busy ? "Starting…" : "Enable 2FA"}
          </Button>
        ) : null}
      </div>

      {enrolling && (
        <div className="mt-3 rounded-2xl border border-white/50 bg-white/70 p-4 backdrop-blur">
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
            <img src={enrolling.qr} alt="QR code" className="h-36 w-36 rounded-xl bg-white p-2 ring-1 ring-white/60" />
            <div className="flex-1 text-sm">
              <p className="font-medium">Scan with your authenticator app</p>
              <p className="mt-1 text-xs text-muted-foreground">Or enter this secret manually:</p>
              <code className="mt-1 block break-all rounded-lg bg-slate-100 px-2 py-1 font-mono text-[11px]">{enrolling.secret}</code>
              <div className="mt-3 flex gap-2">
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  inputMode="numeric"
                  maxLength={6}
                  className="font-mono"
                />
                <Button onClick={verify} disabled={busy || code.length !== 6} className="btn-gradient border-0">
                  {busy ? "Verifying…" : "Verify"}
                </Button>
              </div>
              <button
                type="button"
                onClick={() => { setEnrolling(null); setCode(""); }}
                className="mt-2 text-xs text-muted-foreground underline-offset-4 hover:underline"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
