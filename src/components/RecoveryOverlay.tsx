import { useEffect, useState } from "react";
import { RefreshCw, AlertTriangle, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "chunk-reload-attempted";

type Phase = "idle" | "reloading" | "failed";

export function RecoveryOverlay() {
  const [phase, setPhase] = useState<Phase>("idle");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onReload = () => setPhase("reloading");
    const onFailed = () => setPhase("failed");
    window.addEventListener("chunk-reload", onReload);
    window.addEventListener("chunk-reload-failed", onFailed);
    return () => {
      window.removeEventListener("chunk-reload", onReload);
      window.removeEventListener("chunk-reload-failed", onFailed);
    };
  }, []);

  // Auto-promote reloading → failed if still alive after 6s.
  useEffect(() => {
    if (phase !== "reloading") return;
    const t = window.setTimeout(() => setPhase("failed"), 6000);
    return () => window.clearTimeout(t);
  }, [phase]);

  if (phase === "idle") return null;

  const handleRetry = () => {
    try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    const url = new URL(window.location.href);
    url.searchParams.set("_r", String(Date.now()));
    window.location.replace(url.toString());
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/95 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-lg">
        {phase === "reloading" ? (
          <>
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
            <h2 className="text-base font-semibold">Updating to the latest version…</h2>
            <p className="mt-1 text-sm text-muted-foreground">This will only take a moment.</p>
          </>
        ) : (
          <>
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </div>
            <h2 className="text-base font-semibold">We couldn't reload automatically</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              A newer version of the app is available. Reload to continue.
            </p>
            <div className="mt-5 flex justify-center gap-2">
              <Button onClick={handleRetry} className="gap-2">
                <RefreshCw className="h-4 w-4" /> Retry
              </Button>
              <Button variant="outline" asChild>
                <a href="/" className="gap-2"><Home className="h-4 w-4" /> Go home</a>
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
