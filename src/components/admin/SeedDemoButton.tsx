import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Copy, Check, Database, Eye, EyeOff, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { runDemoSeed } from "@/lib/admin.functions";

const KNOWN_EMAILS = [
  { label: "Demo user", email: "demo@callescort24.test" },
  { label: "Admin user", email: "admin@callescort24.test" },
];

type RotatedAccount = { label: string; email: string; password: string };

function CopyField({ value, mono = true }: { value: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      className={`inline-flex items-center gap-1.5 rounded-md bg-muted/60 px-2 py-1 text-xs hover:bg-muted ${mono ? "font-mono" : ""}`}
    >
      <span className="max-w-[260px] truncate">{value}</span>
      {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
    </button>
  );
}

export function SeedDemoButton() {
  const runSeed = useServerFn(runDemoSeed);
  const [loading, setLoading] = useState(false);
  const [rotated, setRotated] = useState<RotatedAccount[] | null>(null);
  const [reveal, setReveal] = useState(true);
  const [rotatedAt, setRotatedAt] = useState<string | null>(null);

  const handleSeed = async () => {
    setLoading(true);
    try {
      const result = await runSeed();
      const created = result.accounts.filter(a => a.was_created).length;
      const seeded = result.accounts.reduce((s, a) => s + a.listings_seeded, 0);
      const mapped: RotatedAccount[] = result.accounts.map(a => ({
        label: a.email.startsWith("admin") ? "Admin user" : "Demo user",
        email: a.email,
        password: a.password,
      }));
      setRotated(mapped);
      setRotatedAt(result.rotated_at);
      setReveal(true);
      toast.success(
        `Credentials rotated · ${created} created · ${seeded} listing(s) seeded`
      );
    } catch (e: any) {
      toast.error(e.message ?? "Seed failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="rounded-2xl border-0 bg-white/70 backdrop-blur dark:bg-white/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Database className="h-4 w-4" />
          Demo accounts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Rotates passwords to fresh 24-character strings on every run, confirms emails,
          and reseeds sample listings if needed. The new passwords are shown once below — copy them now.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={handleSeed} disabled={loading} className="btn-gradient rounded-full border-0">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCw className="mr-2 h-4 w-4" />}
            {loading ? "Rotating…" : rotated ? "Rotate again" : "Rotate & reveal credentials"}
          </Button>
          {rotated && (
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => setReveal(r => !r)}>
              {reveal ? <EyeOff className="mr-1.5 h-3.5 w-3.5" /> : <Eye className="mr-1.5 h-3.5 w-3.5" />}
              {reveal ? "Hide" : "Show"}
            </Button>
          )}
        </div>

        {!rotated && (
          <div className="space-y-2 border-t border-border/40 pt-3">
            <p className="text-xs text-muted-foreground">Known account emails (passwords hidden until rotated):</p>
            {KNOWN_EMAILS.map(a => (
              <div key={a.email} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="w-24 text-xs uppercase tracking-wide text-muted-foreground">{a.label}</span>
                <CopyField value={a.email} mono={false} />
              </div>
            ))}
          </div>
        )}

        {rotated && (
          <div className="space-y-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
            <p className="text-xs font-medium text-amber-200">
              Credentials rotated{rotatedAt ? ` at ${new Date(rotatedAt).toLocaleTimeString()}` : ""} — copy now, they will not be shown again.
            </p>
            {rotated.map(a => (
              <div key={a.email} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="w-24 text-xs uppercase tracking-wide text-muted-foreground">{a.label}</span>
                <CopyField value={a.email} mono={false} />
                {reveal ? (
                  <CopyField value={a.password} />
                ) : (
                  <span className="rounded-md bg-muted/60 px-2 py-1 font-mono text-xs text-muted-foreground">••••••••••••••••••••••••</span>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
