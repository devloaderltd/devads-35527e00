import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  LayoutDashboard, Users, Flag, Package, Tag, MapPin,
  CreditCard, Bitcoin, Wallet, Settings, FileClock, ShieldCheck,
  ShieldAlert, Sparkles, BarChart3, Megaphone, Star, MessagesSquare, Bug, Wrench, Bell, BadgeCheck,
} from "lucide-react";

import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import { getAdminBadges } from "@/lib/admin.functions";

const groups = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", url: "/admin", icon: LayoutDashboard, exact: true },
      { title: "Activity", url: "/admin/activity", icon: FileClock },
      { title: "Insights", url: "/admin/insights", icon: BarChart3 },
      { title: "Debug center", url: "/admin/debug", icon: Bug },
    ],
  },
  {
    label: "People",
    items: [
      { title: "Users", url: "/admin/users", icon: Users },
      { title: "KYC verification", url: "/admin/kyc", icon: BadgeCheck, badgeKey: "kyc" as const },
      { title: "Reports", url: "/admin/reports", icon: Flag, badgeKey: "reports" as const },
      { title: "Moderation", url: "/admin/moderation", icon: ShieldAlert, badgeKey: "moderation" as const },
      { title: "Reviews", url: "/admin/reviews", icon: Star },
      { title: "Threads", url: "/admin/threads", icon: MessagesSquare },
    ],
  },

  {
    label: "Content",
    items: [
      { title: "Listings", url: "/admin/listings", icon: Package },
      { title: "Homepage", url: "/admin/homepage", icon: Sparkles },
      { title: "Banners", url: "/admin/banners", icon: Bell },
      { title: "Categories", url: "/admin/categories", icon: Tag },
      { title: "Cities", url: "/admin/cities", icon: MapPin },
    ],
  },
  {
    label: "Finance",
    items: [
      { title: "Payments", url: "/admin/payments", icon: CreditCard },
      { title: "Crypto top-ups", url: "/admin/topups", icon: Bitcoin },
      { title: "Wallets", url: "/admin/wallets", icon: Wallet },
    ],
  },
  {
    label: "System",
    items: [
      { title: "Settings", url: "/admin/settings", icon: Settings },
      { title: "Maintenance", url: "/admin/maintenance", icon: Wrench },
      { title: "Broadcasts", url: "/admin/broadcasts", icon: Megaphone },
      { title: "Audit log", url: "/admin/audit", icon: FileClock },
    ],
  },
] as const;

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (url: string, exact?: boolean) => (exact ? path === url : path === url || path.startsWith(url + "/"));

  const badgesFn = useServerFn(getAdminBadges);
  const { data: badgesData } = useQuery({
    queryKey: ["admin-badges"],
    queryFn: () => badgesFn(),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
  const badges: Record<string, number> = {
    kyc: badgesData?.kyc ?? 0,
    reports: badgesData?.reports ?? 0,
    moderation: badgesData?.moderation ?? 0,
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-white/10 bg-slate-950">
      <SidebarHeader className="border-b border-white/10 bg-slate-950 px-3 py-3">
        <Link to="/admin" className="flex items-center gap-2 font-display text-base font-bold tracking-tight text-slate-100">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow-inner">
            <ShieldCheck className="h-4 w-4" />
          </span>
          {!collapsed && <span className="truncate">CallEscort24 <span className="text-slate-400">Admin</span></span>}
        </Link>
      </SidebarHeader>
      <SidebarContent className="bg-slate-950">
        {groups.map((g) => (
          <SidebarGroup key={g.label}>
            {!collapsed && <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-slate-500">{g.label}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.map((it) => {
                  const badgeCount = "badgeKey" in it && it.badgeKey ? badges[it.badgeKey] ?? 0 : 0;
                  return (
                    <SidebarMenuItem key={it.url}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(it.url, "exact" in it ? it.exact : false)}
                        tooltip={it.title}
                        className="data-[active=true]:bg-white/10 data-[active=true]:text-white hover:bg-white/5"
                      >
                        <Link to={it.url} className="flex w-full items-center gap-2 text-slate-300">
                          <it.icon className="h-4 w-4" />
                          {!collapsed && <span className="flex-1 truncate">{it.title}</span>}
                          {badgeCount > 0 && (
                            <span
                              className={`inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold leading-5 text-white shadow-sm ${
                                collapsed ? "absolute right-1 top-1 h-4 min-w-[1rem] px-1 text-[9px] leading-4" : ""
                              }`}
                              aria-label={`${badgeCount} pending`}
                            >
                              {badgeCount > 99 ? "99+" : badgeCount}
                            </span>
                          )}
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
