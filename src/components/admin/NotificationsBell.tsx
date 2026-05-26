import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Bell, Inbox, BadgeCheck, Flag, Bitcoin, AlertCircle, Megaphone, CreditCard } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { getAdminInbox } from "@/lib/admin.functions";

const ICONS: Record<string, { icon: React.ComponentType<{ className?: string }>; tone: string }> = {
  kyc: { icon: BadgeCheck, tone: "text-amber-300" },
  report: { icon: Flag, tone: "text-rose-300" },
  topup: { icon: Bitcoin, tone: "text-orange-300" },
  error: { icon: AlertCircle, tone: "text-red-300" },
  broadcast: { icon: Megaphone, tone: "text-indigo-300" },
  payment: { icon: CreditCard, tone: "text-fuchsia-300" },
};

const LAST_SEEN_KEY = "admin.inbox.lastSeenAt";

export function NotificationsBell() {
  const fn = useServerFn(getAdminInbox);
  const [lastSeen, setLastSeen] = useState<number>(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const v = window.localStorage.getItem(LAST_SEEN_KEY);
    setLastSeen(v ? Number(v) : 0);
  }, []);

  const { data } = useQuery({
    queryKey: ["admin-inbox", "all"],
    queryFn: () => fn({ data: { kinds: [], limit: 30 } }),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const items = data?.items ?? [];
  const unseen = items.filter((i) => new Date(i.at).getTime() > lastSeen).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8 rounded-full text-slate-300 hover:bg-white/10"
          aria-label={`${unseen} new notifications`}
        >
          <Bell className="h-4 w-4" />
          {unseen > 0 && (
            <span className="absolute right-0.5 top-0.5 grid h-4 min-w-[1rem] place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white">
              {unseen > 99 ? "99+" : unseen}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-96 border-white/10 bg-slate-900 p-0 text-slate-100"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Inbox className="h-3.5 w-3.5" /> Inbox
          </div>
          {unseen > 0 && (
            <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-semibold text-rose-200">
              {unseen} new
            </span>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto divide-y divide-white/5">
          {items.length === 0 && (
            <div className="px-3 py-10 text-center text-xs text-slate-400">All clear.</div>
          )}
          {items.slice(0, 12).map((it) => {
            const meta = ICONS[it.kind] ?? ICONS.broadcast;
            const isNew = new Date(it.at).getTime() > lastSeen;
            return (
              <Link
                key={it.id}
                to={it.link}
                className="flex items-start gap-2.5 px-3 py-2 hover:bg-white/5"
              >
                <span className={`mt-0.5 grid h-7 w-7 place-items-center rounded-md bg-white/5 ${meta.tone}`}>
                  <meta.icon className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm text-slate-100">{it.title}</span>
                    {isNew && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {formatDistanceToNow(new Date(it.at), { addSuffix: true })}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
        <div className="flex items-center justify-between border-t border-white/10 px-3 py-2">
          <button
            type="button"
            className="text-xs text-slate-400 hover:text-slate-100"
            onClick={() => {
              const now = Date.now();
              setLastSeen(now);
              if (typeof window !== "undefined")
                window.localStorage.setItem(LAST_SEEN_KEY, String(now));
            }}
          >
            Mark as seen
          </button>
          <Link to="/admin/notifications" className="text-xs text-indigo-300 hover:text-indigo-200">
            Open inbox →
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
