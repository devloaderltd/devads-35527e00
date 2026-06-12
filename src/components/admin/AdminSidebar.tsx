import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { ComponentType } from "react";
import {
  LayoutDashboard, Users, Flag, Package, Tag, MapPin,
  CreditCard, Bitcoin, Wallet, Settings, FileClock, ShieldCheck,
  ShieldAlert, Sparkles, BarChart3, Megaphone, Star, MessagesSquare, Bug, Wrench, Bell, BadgeCheck,
  RefreshCw, AlertCircle, Inbox, Mail, Database,
} from "lucide-react";

import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getAdminBadges } from "@/lib/admin.functions";
import {
  ADMIN_BADGES_QUERY_KEY,
  EMPTY_BADGES,
  type AdminBadges,
  type BadgeKey,
} from "@/lib/admin-badges";

type Item = {
  title: string;
  url: string;
  icon: ComponentType<{ className?: string }>;
  exact?: boolean;
  badgeKey?: BadgeKey;
  dotKey?: BadgeKey;
};
type Group = { label: string; items: ReadonlyArray<Item> };

const groups: ReadonlyArray<Group> = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", url: "/admin", icon: LayoutDashboard, exact: true },
      { title: "Inbox", url: "/admin/notifications", icon: Inbox, badgeKey: "inbox" },
      { title: "Activity", url: "/admin/activity", icon: FileClock },
      { title: "Insights", url: "/admin/insights", icon: BarChart3 },
      { title: "Debug center", url: "/admin/debug", icon: Bug, dotKey: "errors" },
    ],
  },
  {
    label: "People",
    items: [
      { title: "Users", url: "/admin/users", icon: Users },
      { title: "KYC verification", url: "/admin/kyc", icon: BadgeCheck, badgeKey: "kyc" },
      { title: "Reports", url: "/admin/reports", icon: Flag, badgeKey: "reports" },
      { title: "Moderation", url: "/admin/moderation", icon: ShieldAlert, badgeKey: "moderation" },
      { title: "Reviews", url: "/admin/reviews", icon: Star },
      { title: "Threads", url: "/admin/threads", icon: MessagesSquare },
    ],
  },
  {
    label: "Content",
    items: [
      { title: "Listings", url: "/admin/listings", icon: Package },
      { title: "Homepage", url: "/admin/homepage", icon: Sparkles },
      { title: "Homepage editor", url: "/admin/homepage-editor", icon: Sparkles },
      { title: "Banners", url: "/admin/banners", icon: Bell },
      { title: "Categories", url: "/admin/categories", icon: Tag },
      { title: "Cities", url: "/admin/cities", icon: MapPin },
    ],
  },
  {
    label: "Finance",
    items: [
      { title: "Payments", url: "/admin/payments", icon: CreditCard },
      { title: "Crypto top-ups", url: "/admin/topups", icon: Bitcoin, badgeKey: "topups" },
      { title: "Wallets", url: "/admin/wallets", icon: Wallet },
    ],
  },
  {
    label: "System",
    items: [
      { title: "Settings", url: "/admin/settings", icon: Settings },
      { title: "SMTP", url: "/admin/smtp", icon: Mail },
      { title: "Maintenance", url: "/admin/maintenance", icon: Wrench },
      { title: "Broadcasts", url: "/admin/broadcasts", icon: Megaphone, badgeKey: "broadcasts" },
      { title: "Database", url: "/admin/database", icon: Database },
      { title: "Audit log", url: "/admin/audit", icon: FileClock },
      { title: "Bump audit", url: "/admin/bump-audit", icon: FileClock },
    ],
  },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (url: string, exact?: boolean) => (exact ? path === url : path === url || path.startsWith(url + "/"));

  const badgesFn = useServerFn(getAdminBadges);
  const { data: badgesData, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ADMIN_BADGES_QUERY_KEY,
    queryFn: () => badgesFn(),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
  const badges: AdminBadges = badgesData ?? EMPTY_BADGES;

  return (
    <Sidebar collapsible="icon" className="border-r border-white/10 bg-slate-950">
      <SidebarHeader className="border-b border-white/10 bg-slate-950 px-3 py-3">
        <div className="flex items-center gap-2">
          <Link to="/admin" className="flex min-w-0 flex-1 items-center gap-2 font-display text-base font-bold tracking-tight text-slate-100">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow-inner">
              <ShieldCheck className="h-4 w-4" />
            </span>
            {!collapsed && <span className="truncate">CallEscort24 <span className="text-slate-400">Admin</span></span>}
          </Link>
          {!collapsed && (
            <TooltipProvider delayDuration={200}>
              {isError && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => refetch()}
                      className="grid h-7 w-7 place-items-center rounded-md text-rose-400 hover:bg-white/5"
                      aria-label="Badge counts unavailable, click to retry"
                    >
                      <AlertCircle className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Counts unavailable — click to retry</TooltipContent>
                </Tooltip>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => refetch()}
                    disabled={isFetching}
                    className="grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:bg-white/5 hover:text-slate-100 disabled:opacity-60"
                    aria-label="Refresh counts"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Refresh counts</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent className="bg-slate-950">
        {groups.map((g) => (
          <SidebarGroup key={g.label}>
            {!collapsed && <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-slate-500">{g.label}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.map((it) => {
                  const badgeCount = it.badgeKey ? badges[it.badgeKey] : 0;
                  const dotCount = it.dotKey ? badges[it.dotKey] : 0;
                  const showSkeleton = it.badgeKey && isLoading;
                  const active = isActive(it.url, it.exact);
                  return (
                    <SidebarMenuItem key={it.url}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={it.title}
                        className="relative data-[active=true]:bg-gradient-to-r data-[active=true]:from-indigo-500/20 data-[active=true]:to-fuchsia-500/5 data-[active=true]:text-white hover:bg-white/5"
                      >
                        <Link to={it.url} className="flex w-full items-center gap-2 text-slate-300">
                          {active && (
                            <span
                              aria-hidden
                              className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-gradient-to-b from-indigo-400 to-fuchsia-400"
                            />
                          )}
                          <span className="relative">
                            <it.icon className="h-4 w-4" />
                            {dotCount > 0 && (
                              <span
                                aria-hidden
                                className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400 ring-1 ring-slate-950"
                              />
                            )}
                          </span>
                          {!collapsed && <span className="flex-1 truncate">{it.title}</span>}
                          {showSkeleton ? (
                            !collapsed && <span className="h-4 w-6 animate-pulse rounded-full bg-white/10" aria-label="Loading count" />
                          ) : badgeCount > 0 ? (
                            <span
                              className={`inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold leading-5 text-white shadow-sm ${
                                collapsed ? "absolute right-1 top-1 h-4 min-w-[1rem] px-1 text-[9px] leading-4" : ""
                              }`}
                              aria-label={`${badgeCount} pending`}
                            >
                              {badgeCount > 99 ? "99+" : badgeCount}
                            </span>
                          ) : null}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
