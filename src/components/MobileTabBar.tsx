import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Search, Plus, MessageSquare, User } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const tabs = [
  { to: "/", label: "Home", icon: Home },
  { to: "/search", label: "Search", icon: Search },
  { to: "/messages", label: "Inbox", icon: MessageSquare, auth: true },
  { to: "/dashboard", label: "Me", icon: User, auth: true },
] as const;

export function MobileTabBar() {
  const { user } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Hide on auth/admin/messaging-thread to maximize space
  if (pathname.startsWith("/admin") || pathname.startsWith("/login") || pathname.startsWith("/signup")) {
    return null;
  }

  return (
    <>
      <div className="h-16 md:hidden" aria-hidden />
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/40 bg-white/85 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden dark:border-white/10 dark:bg-slate-950/85">
        <div className="relative mx-auto flex max-w-md items-end justify-around">
          {tabs.slice(0, 2).map((t) => (
            <TabItem key={t.to} to={t.to} label={t.label} Icon={t.icon} active={isActive(pathname, t.to)} />
          ))}

          <Link
            to={user ? "/post" : "/login"}
            className="-mt-6 grid h-14 w-14 place-items-center rounded-full btn-gradient text-white shadow-lg"
            aria-label="Post a listing"
          >
            <Plus className="h-6 w-6" />
          </Link>

          {tabs.slice(2).map((t) => (
            <TabItem
              key={t.to}
              to={user ? t.to : "/login"}
              label={t.label}
              Icon={t.icon}
              active={isActive(pathname, t.to)}
            />
          ))}
        </div>
      </nav>
    </>
  );
}

function isActive(pathname: string, to: string) {
  if (to === "/") return pathname === "/";
  return pathname === to || pathname.startsWith(to + "/");
}

function TabItem({
  to,
  label,
  Icon,
  active,
}: {
  to: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  active: boolean;
}) {
  return (
    <Link
      to={to}
      className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition ${
        active ? "text-primary" : "text-muted-foreground"
      }`}
    >
      <Icon className={`h-5 w-5 ${active ? "scale-110" : ""} transition`} />
      {label}
    </Link>
  );
}
