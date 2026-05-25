import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Toaster } from "@/components/ui/sonner";
import { Header } from "@/components/Header";

import { CityProvider } from "@/lib/city-context";
import { CitySelectorDialog } from "@/components/CitySelectorDialog";
import { supabase } from "@/integrations/supabase/client";
import { ThemeProvider, themeBootScript } from "@/lib/theme-context";
import { getSiteSettings, getMyRoles } from "@/lib/admin.functions";
import { AlertTriangle } from "lucide-react";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          That page doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Try again
          </button>
          <a href="/" className="rounded-md border px-4 py-2 text-sm">Go home</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Marketly — Buy & sell locally across the US, UK, and Canada" },
      { name: "description", content: "Marketly is a country-wide classifieds marketplace. Browse vehicles, housing, jobs, electronics, and more — or post a free listing." },
      { property: "og:title", content: "Marketly — Buy & sell locally across the US, UK, and Canada" },
      { name: "twitter:title", content: "Marketly — Buy & sell locally across the US, UK, and Canada" },
      { property: "og:description", content: "Marketly is a country-wide classifieds marketplace. Browse vehicles, housing, jobs, electronics, and more — or post a free listing." },
      { name: "twitter:description", content: "Marketly is a country-wide classifieds marketplace. Browse vehicles, housing, jobs, electronics, and more — or post a free listing." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/a8fc5217-2efb-4750-9251-3c0ee79077ad" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/a8fc5217-2efb-4750-9251-3c0ee79077ad" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" },
    ],
    scripts: [
      { children: themeBootScript },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Marketly",
          url: "https://devads.lovable.app",
          potentialAction: {
            "@type": "SearchAction",
            target: "https://devads.lovable.app/search?q={search_term_string}",
            "query-input": "required name=search_term_string",
          },
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAdminArea = pathname === "/admin" || pathname.startsWith("/admin/");
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <CityProvider>
          <AuthInvalidator />
          {isAdminArea ? (
            <Outlet />
          ) : (
            <div className="relative flex min-h-screen flex-col">
              <div className="aurora-mesh" aria-hidden />
              <MaintenanceGate>
                <Header />
                <main className="flex-1">
                  <Outlet />
                </main>
                <footer className="mt-16 border-t border-white/40 bg-white/40 backdrop-blur-md py-8 text-center text-sm text-muted-foreground dark:border-white/10 dark:bg-white/5">
                  <div className="container mx-auto px-4 flex flex-col items-center gap-3">
                    <div className="h-[2px] w-24 rounded-full" style={{ background: "var(--gradient-primary)" }} />
                    <div>© {new Date().getFullYear()} <span className="font-display font-bold gradient-text">Marketly</span> — Buy and sell across the US, UK & Canada.</div>
                  </div>
                </footer>
              </MaintenanceGate>
            </div>
          )}
          {!isAdminArea && <CitySelectorDialog dismissable />}
        </CityProvider>
      </ThemeProvider>
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}

function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const fetchSettings = useServerFn(getSiteSettings);
  const fetchRoles = useServerFn(getMyRoles);

  const { data: settingsData } = useQuery({
    queryKey: ["site-settings-public"],
    queryFn: () => fetchSettings(),
    staleTime: 60_000,
  });

  const { data: rolesData } = useQuery({
    queryKey: ["my-roles"],
    queryFn: async () => {
      try { return await fetchRoles(); } catch { return { roles: [] as string[] }; }
    },
    staleTime: 60_000,
  });

  const s = settingsData?.settings;
  const isAdmin = (rolesData?.roles ?? []).includes("admin");
  const maintenance = !!s?.maintenance_mode;

  if (maintenance && !isAdmin) {
    return (
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md rounded-3xl border border-white/50 bg-white/70 p-8 text-center backdrop-blur-xl shadow-[var(--shadow-float)]">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full" style={{ background: "var(--gradient-warm)" }}>
            <AlertTriangle className="h-6 w-6 text-white" />
          </div>
          <h1 className="font-display text-2xl font-bold">{s?.site_name || "Marketly"}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{s?.maintenance_message || "We are performing maintenance. Please check back soon."}</p>
          {s?.support_email && (
            <p className="mt-4 text-xs text-muted-foreground">
              Need help? <a className="underline" href={`mailto:${s.support_email}`}>{s.support_email}</a>
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      {maintenance && isAdmin && (
        <div className="relative z-20 flex items-center justify-center gap-2 bg-amber-500/90 px-4 py-2 text-center text-xs font-medium text-white">
          <AlertTriangle className="h-3.5 w-3.5" />
          Maintenance mode is ON. Only admins can see the site. {s?.maintenance_message ? `— ${s.maintenance_message}` : null}
        </div>
      )}
      {children}
    </>
  );
}

function AuthInvalidator() {
  const router = useRouter();
  const qc = useQueryClient();
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "INITIAL_SESSION") return;
      window.setTimeout(() => {
        router.invalidate();
        qc.invalidateQueries();
      }, 0);
    });
    return () => subscription.unsubscribe();
  }, [router, qc]);
  return null;
}
