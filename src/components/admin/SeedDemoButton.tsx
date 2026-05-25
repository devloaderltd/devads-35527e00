import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Copy, Check, Database } from "lucide-react";
import { toast } from "sonner";
import { runDemoSeed } from "@/lib/admin.functions";

const ACCOUNTS = [
  { label: "Demo user", email: "demo@callescort24.test", password: "DemoUser123!" },
  { label: "Admin user", email: "admin@callescort24.test", password: "Adm!n-CallEscort24-2026#Xq7" },
];

function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      className="inline-flex items-center gap-1.5 rounded-md bg-muted/60 px-2 py-1 font-mono text-xs hover:bg-muted"
    >
      <span>{value}</span>
      {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
    </button>
  );
}

export function SeedDemoButton() {
  const runSeed = useServerFn(runDemoSeed);
  const [loading, setLoading] = useState(false);

  const handleSeed = async () => {
    setLoading(true);
    try {
      const result = await runSeed();
      const created = result.accounts.filter(a => a.was_created).length;
      const seeded = result.accounts.reduce((s, a) => s + a.listings_seeded, 0);
      toast.success(
        created > 0
          ? `Created ${created} account(s), seeded ${seeded} listings`
          : `Demo accounts refreshed${seeded ? `, seeded ${seeded} new listings` : ""}`
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
          Recreate or refresh the demo + admin test accounts. Passwords are reset and emails confirmed on every run.
        </p>
        <Button onClick={handleSeed} disabled={loading} className="btn-gradient rounded-full border-0">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {loading ? "Seeding…" : "Seed / refresh demo accounts"}
        </Button>
        <div className="space-y-2 border-t border-border/40 pt-3">
          {ACCOUNTS.map(a => (
            <div key={a.email} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="w-24 text-xs uppercase tracking-wide text-muted-foreground">{a.label}</span>
              <CopyField value={a.email} />
              <CopyField value={a.password} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
