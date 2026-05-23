import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { Header } from "@/components/Header";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { supabase } from "@/integrations/supabase/client";

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
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/84617a50-3429-4005-9493-99c26a8cdecc/id-preview-e107f23c--4e817e8c-6b6f-4c13-a579-a3b9b7d44ed7.lovable.app-1779559555756.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/84617a50-3429-4005-9493-99c26a8cdecc/id-preview-e107f23c--4e817e8c-6b6f-4c13-a579-a3b9b7d44ed7.lovable.app-1779559555756.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" },
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
  return (
    <QueryClientProvider client={queryClient}>
      <AuthInvalidator />
      <div className="flex min-h-screen flex-col">
        <PaymentTestModeBanner />
        <Header />
        <main className="flex-1">
          <Outlet />
        </main>
        <footer className="border-t bg-muted/30 py-8 text-center text-sm text-muted-foreground">
          <div className="container mx-auto px-4">
            © {new Date().getFullYear()} Marketly. Buy and sell across the US, UK & Canada.
          </div>
        </footer>
      </div>
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}

function AuthInvalidator() {
  const router = useRouter();
  const qc = useQueryClient();
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      router.invalidate();
      qc.invalidateQueries();
    });
    return () => subscription.unsubscribe();
  }, [router, qc]);
  return null;
}
