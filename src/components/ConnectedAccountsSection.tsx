import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Link2 } from "lucide-react";

export function ConnectedAccountsSection() {
  const { user } = useAuth();
  const identities = (user?.identities ?? []) as Array<{ provider: string }>;
  const providers = ["google", "email"] as const;

  return (
    <section className="mt-5 border-t border-white/40 pt-5">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Link2 className="h-3.5 w-3.5" /> Connected accounts
      </div>
      <ul className="mt-2 space-y-2">
        {providers.map((p) => {
          const connected = identities.some(i => i.provider === p);
          return (
            <li key={p} className="flex items-center justify-between rounded-xl border border-white/40 bg-white/60 px-3 py-2 backdrop-blur">
              <span className="text-sm font-medium capitalize">{p}</span>
              {connected ? (
                <Badge className="rounded-full bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Connected</Badge>
              ) : (
                <Badge variant="outline" className="rounded-full">Not connected</Badge>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
