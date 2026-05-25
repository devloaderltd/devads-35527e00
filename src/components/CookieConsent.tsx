import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Cookie, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const KEY = "marketly.cookie-consent";

export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {
      /* localStorage disabled — leave hidden */
    }
  }, []);

  const persist = (value: "accepted" | "essential") => {
    try {
      localStorage.setItem(KEY, value);
    } catch {
      /* ignore */
    }
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-3 z-50 flex justify-center px-3 md:bottom-6">
      <div className="pointer-events-auto w-full max-w-2xl rounded-2xl border border-white/40 bg-white/85 p-4 shadow-[var(--shadow-float-lg)] backdrop-blur-2xl dark:border-white/10 dark:bg-zinc-900/80">
        <div className="flex items-start gap-3">
          <div
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white shadow-md"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Cookie className="h-4 w-4" />
          </div>
          <div className="flex-1 text-sm">
            <div className="font-semibold">We use cookies</div>
            <p className="mt-0.5 text-muted-foreground">
              We use essential cookies to run Marketly and optional ones to improve the experience. See
              our <Link to="/cookies" className="text-primary hover:underline">Cookies Policy</Link>.
            </p>
          </div>
          <button
            aria-label="Dismiss"
            onClick={() => persist("essential")}
            className="text-muted-foreground transition hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            className="rounded-full bg-white/70"
            onClick={() => persist("essential")}
          >
            Essential only
          </Button>
          <Button
            size="sm"
            className="btn-gradient rounded-full border-0"
            onClick={() => persist("accepted")}
          >
            Accept all
          </Button>
        </div>
      </div>
    </div>
  );
}
