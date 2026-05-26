import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Bell, BadgeCheck, Flag, Bitcoin, Megaphone, ShieldAlert } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { getAdminBadges } from "@/lib/admin.functions";

export function NotificationsBell() {
  const fn = useServerFn(getAdminBadges);
  const { data } = useQuery({
    queryKey: ["admin-badges"],
    queryFn: () => fn(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const total = (data?.kyc ?? 0) + (data?.reports ?? 0) + (data?.topups ?? 0) + (data?.moderation ?? 0);
  const items = [
    { key: "kyc", label: "KYC awaiting review", count: data?.kyc ?? 0, href: "/admin/kyc", icon: BadgeCheck, color: "text-amber-300" },
    { key: "reports", label: "Open user reports", count: data?.reports ?? 0, href: "/admin/reports", icon: Flag, color: "text-rose-300" },
    { key: "topups", label: "Pending crypto top-ups", count: data?.topups ?? 0, href: "/admin/topups", icon: Bitcoin, color: "text-orange-300" },
    { key: "moderation", label: "Listings in draft", count: data?.moderation ?? 0, href: "/admin/moderation", icon: ShieldAlert, color: "text-fuchsia-300" },
    { key: "broadcasts", label: "Broadcasts (7d)", count: data?.broadcasts ?? 0, href: "/admin/broadcasts", icon: Megaphone, color: "text-indigo-300" },
  ];
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8 rounded-full text-slate-300 hover:bg-white/10"
          aria-label={`${total} pending items`}
        >
          <Bell className="h-4 w-4" />
          {total > 0 && (
            <span className="absolute right-0.5 top-0.5 grid h-4 min-w-[1rem] place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white">
              {total > 99 ? "99+" : total}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 border-white/10 bg-slate-900 p-0 text-slate-100"
      >
        <div className="border-b border-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Operations queue
        </div>
        <div className="divide-y divide-white/5">
          {items.map((it) => (
            <Link
              key={it.key}
              to={it.href}
              className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-white/5"
            >
              <span className={`grid h-7 w-7 place-items-center rounded-md bg-white/5 ${it.color}`}>
                <it.icon className="h-3.5 w-3.5" />
              </span>
              <span className="flex-1 truncate text-slate-200">{it.label}</span>
              <span className={`min-w-[1.5rem] rounded-full px-1.5 text-center text-[11px] font-semibold ${it.count > 0 ? "bg-rose-500/20 text-rose-200" : "bg-white/5 text-slate-400"}`}>
                {it.count}
              </span>
            </Link>
          ))}
        </div>
        <div className="border-t border-white/10 px-3 py-2 text-right">
          <Link to="/admin/activity" className="text-xs text-indigo-300 hover:text-indigo-200">
            Open full activity →
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
