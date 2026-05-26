import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronRight, Home } from "lucide-react";

const titles: Record<string, string> = {
  "": "Admin",
  insights: "Insights",
  debug: "Debug",
  activity: "Activity",
  users: "Users",
  kyc: "KYC",
  reports: "Reports",
  moderation: "Moderation",
  reviews: "Reviews",
  threads: "Threads",
  listings: "Listings",
  homepage: "Homepage",
  banners: "Banners",
  categories: "Categories",
  cities: "Cities",
  payments: "Payments",
  topups: "Top-ups",
  wallets: "Wallets",
  settings: "Settings",
  maintenance: "Maintenance",
  broadcasts: "Broadcasts",
  audit: "Audit log",
};

export function AdminBreadcrumbs() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const parts = path.replace(/^\/admin\/?/, "").split("/").filter(Boolean);

  return (
    <nav className="hidden items-center gap-1 text-xs text-slate-400 md:flex" aria-label="Breadcrumb">
      <Link to="/admin" className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-white/5 hover:text-slate-200">
        <Home className="h-3 w-3" />
        Admin
      </Link>
      {parts.map((seg, i) => {
        const href = "/admin/" + parts.slice(0, i + 1).join("/");
        const last = i === parts.length - 1;
        const label = titles[seg] ?? seg.replace(/-/g, " ");
        return (
          <span key={href} className="inline-flex items-center gap-1">
            <ChevronRight className="h-3 w-3 text-slate-600" />
            {last ? (
              <span className="rounded px-1.5 py-0.5 capitalize text-slate-100">{label}</span>
            ) : (
              <Link to={href} className="rounded px-1.5 py-0.5 capitalize hover:bg-white/5 hover:text-slate-200">{label}</Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
