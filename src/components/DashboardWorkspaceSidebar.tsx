import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Package,
  MessageSquare,
  Wallet,
  Heart,
  BookmarkCheck,
  Bell,
  User,
  Plus,
  Rocket,
  Star,
  Settings,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const workspace = [
  { title: "Overview", url: "/dashboard", icon: LayoutDashboard },
  { title: "My Listings", url: "/my-listings", icon: Package },
  { title: "Messages", url: "/messages", icon: MessageSquare },
  { title: "Promotions", url: "/dashboard?tab=promotions", icon: Rocket, match: "/dashboard" },
  { title: "Reviews", url: "/dashboard?tab=reviews", icon: Star, match: "/dashboard" },
  { title: "Wallet", url: "/wallet", icon: Wallet },
];

const personal = [
  { title: "Favorites", url: "/favorites", icon: Heart },
  { title: "Saved searches", url: "/saved-searches", icon: BookmarkCheck },
  { title: "Notifications", url: "/notifications", icon: Bell },
  { title: "Profile", url: "/profile", icon: User },
  { title: "Settings", url: "/profile?tab=settings", icon: Settings, match: "/profile" },
];

export function DashboardWorkspaceSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const isActive = (item: { url: string; match?: string }) => {
    const target = item.match ?? item.url;
    return pathname === target;
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="bg-gradient-to-r from-primary to-purple-500 text-white hover:opacity-95">
                  <Link to="/post" className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    {!collapsed && <span>New listing</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {workspace.map((item) => {
                const hasQuery = item.url.includes("?");
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item)}>
                      {hasQuery ? (
                        <a href={item.url} className="flex items-center gap-2">
                          <item.icon className="h-4 w-4" />
                          {!collapsed && <span>{item.title}</span>}
                        </a>
                      ) : (
                        <Link to={item.url as never} className="flex items-center gap-2">
                          <item.icon className="h-4 w-4" />
                          {!collapsed && <span>{item.title}</span>}
                        </Link>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {personal.map((item) => {
                const hasQuery = item.url.includes("?");
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item)}>
                      {hasQuery ? (
                        <a href={item.url} className="flex items-center gap-2">
                          <item.icon className="h-4 w-4" />
                          {!collapsed && <span>{item.title}</span>}
                        </a>
                      ) : (
                        <Link to={item.url as never} className="flex items-center gap-2">
                          <item.icon className="h-4 w-4" />
                          {!collapsed && <span>{item.title}</span>}
                        </Link>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
