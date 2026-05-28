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
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Toaster } from "@/components/ui/sonner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CookieConsent } from "@/components/CookieConsent";
import { MobileTabBar } from "@/components/MobileTabBar";
import { CompareBar } from "@/components/CompareBar";
import { CompareProvider } from "@/lib/compare-context";
import { OnboardingTour } from "@/components/OnboardingTour";
import { RouteProgress } from "@/components/RouteProgress";
import { CommandPalette } from "@/components/CommandPalette";


import { CityProvider } from "@/lib/city-context";
import { CitySelectorDialog } from "@/components/CitySelectorDialog";
import { supabase } from "@/integrations/supabase/client";
import { ThemeProvider, themeBootScript } from "@/lib/theme-context";
import { getSiteSettings, getMyRoles } from "@/lib/admin.functions";
import { AlertTriangle } from "lucide-react";
import { isAuthError } from "@/lib/auth-errors";
import { AuthErrorFallback } from "@/components/AuthErrorFallback";
import { isChunkLoadError, reloadOnceForChunkError } from "@/lib/chunk-reload";


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
  if (isAuthError(error)) {
    return <AuthErrorFallback error={error} reset={() => { router.invalidate(); reset(); }} />;
  }
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
      { title: "CallEscort24 — Buy & sell locally across the US, UK, and Canada" },
      { name: "description", content: "CallEscort24 is a country-wide classifieds marketplace. Browse vehicles, housing, jobs, electronics, and more — or post a free listing." },
      { property: "og:title", content: "CallEscort24 — Buy & sell locally across the US, UK, and Canada" },
      { name: "twitter:title", content: "CallEscort24 — Buy & sell locally across the US, UK, and Canada" },
      { property: "og:description", content: "CallEscort24 is a country-wide classifieds marketplace. Browse vehicles, housing, jobs, electronics, and more — or post a free listing." },
      { name: "twitter:description", content: "CallEscort24 is a country-wide classifieds marketplace. Browse vehicles, housing, jobs, electronics, and more — or post a free listing." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/a8fc5217-2efb-4750-9251-3c0ee79077ad" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/a8fc5217-2efb-4750-9251-3c0ee79077ad" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/favicon.png" },
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
          name: "CallEscort24",
          url: "https://callescort24.org",
          potentialAction: {
            "@type": "SearchAction",
            target: "https://callescort24.org/search?q={search_term_string}",
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
          <CompareProvider>
            <RouteProgress />
            <AuthInvalidator />
            <DynamicFavicon />
            {isAdminArea ? (
              <Outlet />
            ) : (
              <div className="relative flex min-h-screen flex-col">
                <div className="aurora-mesh" aria-hidden />
                <MaintenanceGate>
                  <Header />
                  <main className="flex-1 pb-16 md:pb-0">
                    <Outlet />
                  </main>
                  <Footer />
                  <MobileTabBar />
                  <CompareBar />
                  <OnboardingTour />
                  <CommandPalette />
                </MaintenanceGate>
              </div>
            )}
            {!isAdminArea && <CitySelectorDialog dismissable />}
            {!isAdminArea && <CookieConsent />}
          </CompareProvider>
        </CityProvider>
      </ThemeProvider>

      <Toaster position="top-center" closeButton />
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

  const [hasSession, setHasSession] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setHasSession(!!data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setHasSession(!!s));
    return () => subscription.unsubscribe();
  }, []);

  const { data: rolesData } = useQuery({
    queryKey: ["my-roles"],
    queryFn: async () => {
      try { return await fetchRoles(); } catch { return { roles: [] as string[] }; }
    },
    staleTime: 60_000,
    enabled: hasSession,
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
          <h1 className="font-display text-2xl font-bold">{s?.site_name || "CallEscort24"}</h1>
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
    import("@/lib/error-reporter").then((m) => m.installErrorReporter()).catch(() => {});
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

function DynamicFavicon() {
  const fetchSettings = useServerFn(getSiteSettings);
  const { data } = useQuery({
    queryKey: ["site-settings-public"],
    queryFn: () => fetchSettings(),
    staleTime: 60_000,
  });
  const url = (data?.settings as any)?.favicon_url as string | undefined;
  useEffect(() => {
    if (typeof document === "undefined" || !url) return;
    const selectors = ['link[rel="icon"]', 'link[rel="apple-touch-icon"]'];
    const originals: Array<{ el: HTMLLinkElement; href: string }> = [];
    for (const sel of selectors) {
      document.querySelectorAll<HTMLLinkElement>(sel).forEach((el) => {
        originals.push({ el, href: el.href });
        el.href = url;
      });
    }
    return () => { originals.forEach(({ el, href }) => { el.href = href; }); };
  }, [url]);
  return null;
}

