import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";

const STORAGE_KEY = "ce24.age-verified";
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function isVerified(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return false;
    return Date.now() - ts < TTL_MS;
  } catch {
    return false;
  }
}

export function AgeGateModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isVerified()) setOpen(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const accept = () => {
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {}
    setOpen(false);
  };
  const decline = () => {
    window.location.replace("https://www.google.com");
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-gate-title"
      className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-6"
      style={{ background: "rgba(8, 6, 24, 0.78)", backdropFilter: "blur(14px)" }}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/15 bg-card text-card-foreground shadow-2xl motion-safe:animate-[brand-fade-in_360ms_ease-out_both]"
        style={{ boxShadow: "var(--shadow-float-lg, 0 30px 80px rgba(0,0,0,0.5))" }}
      >
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-1.5"
          style={{ background: "var(--gradient-primary)" }}
        />
        <div className="px-6 pt-8 pb-6 sm:px-8">
          <div className="flex items-center gap-3">
            <div
              className="grid h-12 w-12 place-items-center rounded-2xl"
              style={{ background: "var(--gradient-warm, linear-gradient(135deg,#f59e0b,#ef4444))" }}
            >
              <ShieldAlert className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Adults Only
              </p>
              <h2 id="age-gate-title" className="font-display text-2xl font-bold leading-tight">
                You must be 18+ to enter
              </h2>
            </div>
          </div>

          <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
            <strong className="text-foreground">CallEscort24</strong> is an adult directory containing
            explicit content, nudity, and listings for adult services posted by independent advertisers.
          </p>

          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <span aria-hidden className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              I am at least <strong className="text-foreground">18 years old</strong> (or the age of
              majority where I live, whichever is higher).
            </li>
            <li className="flex gap-2">
              <span aria-hidden className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              Viewing adult content is legal in my country, state, or region.
            </li>
            <li className="flex gap-2">
              <span aria-hidden className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              I will not share content from this site with anyone under 18.
            </li>
            <li className="flex gap-2">
              <span aria-hidden className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              I agree to the{" "}
              <Link to="/terms" className="underline underline-offset-2 hover:text-foreground">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link to="/privacy" className="underline underline-offset-2 hover:text-foreground">
                Privacy Policy
              </Link>
              .
            </li>
          </ul>

          <p className="mt-4 rounded-xl border border-border/60 bg-muted/40 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
            CallEscort24 is a classified advertising platform. We do not provide, broker, or endorse any
            services. All advertisers are independent third parties responsible for their own listings.
          </p>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
            <button
              onClick={accept}
              className="inline-flex flex-1 items-center justify-center rounded-full px-5 py-3 text-sm font-semibold text-white shadow-lg transition active:scale-[0.98]"
              style={{ background: "var(--gradient-primary)" }}
            >
              I am 18 or older — Enter
            </button>
            <button
              onClick={decline}
              className="inline-flex flex-1 items-center justify-center rounded-full border border-border bg-background px-5 py-3 text-sm font-medium text-foreground transition hover:bg-muted active:scale-[0.98]"
            >
              I am under 18 — Leave
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
