import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard, BarChart3, Users, BadgeCheck, Flag, ShieldAlert,
  Star, MessagesSquare, Package, Sparkles, Bell, Tag, MapPin,
  CreditCard, Bitcoin, Wallet, Settings, Wrench, Megaphone, FileClock,
  Bug, Activity, Search,
} from "lucide-react";
import { searchAdmin } from "@/lib/admin.functions";

const NAV = [
  { icon: LayoutDashboard, label: "Dashboard", url: "/admin" },
  { icon: BarChart3, label: "Insights", url: "/admin/insights" },
  { icon: Activity, label: "Activity feed", url: "/admin/activity" },
  { icon: Bug, label: "Debug center", url: "/admin/debug" },
  { icon: Users, label: "Users", url: "/admin/users" },
  { icon: BadgeCheck, label: "KYC verification", url: "/admin/kyc" },
  { icon: Flag, label: "Reports", url: "/admin/reports" },
  { icon: ShieldAlert, label: "Moderation", url: "/admin/moderation" },
  { icon: Star, label: "Reviews", url: "/admin/reviews" },
  { icon: MessagesSquare, label: "Threads", url: "/admin/threads" },
  { icon: Package, label: "Listings", url: "/admin/listings" },
  { icon: Sparkles, label: "Homepage", url: "/admin/homepage" },
  { icon: Bell, label: "Banners", url: "/admin/banners" },
  { icon: Tag, label: "Categories", url: "/admin/categories" },
  { icon: MapPin, label: "Cities", url: "/admin/cities" },
  { icon: CreditCard, label: "Payments", url: "/admin/payments" },
  { icon: Bitcoin, label: "Crypto top-ups", url: "/admin/topups" },
  { icon: Wallet, label: "Wallets", url: "/admin/wallets" },
  { icon: Settings, label: "Settings", url: "/admin/settings" },
  { icon: Wrench, label: "Maintenance", url: "/admin/maintenance" },
  { icon: Megaphone, label: "Broadcasts", url: "/admin/broadcasts" },
  { icon: FileClock, label: "Audit log", url: "/admin/audit" },
] as const;

export function AdminCommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ users: { id: string; display_name: string }[]; listings: { id: string; title: string; slug: string }[]; payments: { id: string; amount: number; status: string }[] }>({ users: [], listings: [], payments: [] });
  const searchFn = useServerFn(searchAdmin);

  useEffect(() => {
    if (!open) { setQ(""); setResults({ users: [], listings: [], payments: [] }); }
  }, [open]);

  useEffect(() => {
    if (!open || q.length < 2) { setResults({ users: [], listings: [], payments: [] }); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const r = await searchFn({ data: { q } });
        if (!cancelled) setResults(r as never);
      } catch { /* ignore */ }
    }, 200);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q, open, searchFn]);

  const go = (cb: () => void) => { onOpenChange(false); setTimeout(cb, 50); };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command or search users, listings, payments…" value={q} onValueChange={setQ} />
      <CommandList>
        <CommandEmpty>
          <div className="flex flex-col items-center gap-1 py-6 text-slate-400">
            <Search className="h-6 w-6 opacity-50" />
            <span className="text-sm">No matches. Try a name, title, or session id.</span>
          </div>
        </CommandEmpty>

        {q.length >= 2 && (results.users.length + results.listings.length + results.payments.length) > 0 && (
          <>
            {results.users.length > 0 && (
              <CommandGroup heading="Users">
                {results.users.map((u) => (
                  <CommandItem key={u.id} value={`user-${u.id}-${u.display_name}`} onSelect={() => go(() => navigate({ to: `/admin/users`, search: { q: u.display_name } as never }))}>
                    <Users className="mr-2 h-4 w-4" />
                    {u.display_name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {results.listings.length > 0 && (
              <CommandGroup heading="Listings">
                {results.listings.map((l) => (
                  <CommandItem key={l.id} value={`listing-${l.id}-${l.title}`} onSelect={() => go(() => navigate({ to: `/admin/listings`, search: { q: l.title } as never }))}>
                    <Package className="mr-2 h-4 w-4" />
                    {l.title}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {results.payments.length > 0 && (
              <CommandGroup heading="Payments">
                {results.payments.map((p) => (
                  <CommandItem key={p.id} value={`payment-${p.id}`} onSelect={() => go(() => navigate({ to: `/admin/payments` }))}>
                    <CreditCard className="mr-2 h-4 w-4" />
                    ${Number(p.amount).toFixed(2)} — {p.status}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            <CommandSeparator />
          </>
        )}

        <CommandGroup heading="Quick actions">
          <CommandItem onSelect={() => go(() => navigate({ to: "/admin/kyc" }))}>
            <BadgeCheck className="mr-2 h-4 w-4" /> Review next KYC submission
          </CommandItem>
          <CommandItem onSelect={() => go(() => navigate({ to: "/admin/reports" }))}>
            <Flag className="mr-2 h-4 w-4" /> Review next open report
          </CommandItem>
          <CommandItem onSelect={() => go(() => navigate({ to: "/admin/topups" }))}>
            <Bitcoin className="mr-2 h-4 w-4" /> Process pending top-ups
          </CommandItem>
          <CommandItem onSelect={() => go(() => navigate({ to: "/admin/broadcasts" }))}>
            <Megaphone className="mr-2 h-4 w-4" /> Send a broadcast
          </CommandItem>
          <CommandItem onSelect={() => go(() => navigate({ to: "/admin/maintenance" }))}>
            <Wrench className="mr-2 h-4 w-4" /> Toggle maintenance mode
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Navigate">
          {NAV.map((n) => (
            <CommandItem key={n.url} onSelect={() => go(() => navigate({ to: n.url }))}>
              <n.icon className="mr-2 h-4 w-4" />
              {n.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
