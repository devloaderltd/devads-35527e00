import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Cookie, X, ShieldCheck, BarChart3, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useConsent } from "@/lib/cookie-consent";
import { useCity } from "@/lib/city-context";

export function CookieConsent() {
  const { consent, save } = useConsent();
  const { cityId, hydrated, pickerOpen } = useCity();
  const [customizing, setCustomizing] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  // The city selector dialog (non-dismissable for first-time visitors) covers
  // the screen with a modal overlay and would block clicks on this banner.
  // Wait until it's closed before showing cookie consent.
  const cityDialogOpen = pickerOpen || (hydrated && !cityId);
  if (cityDialogOpen) return null;

  // Only show the banner when no decision has been recorded yet.
  if (consent) return null;

  const acceptAll = () => save({ analytics: true, marketing: true });
  const rejectOptional = () => save({ analytics: false, marketing: false });
  const savePreferences = () => save({ analytics, marketing });

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
              Essential cookies keep CallEscort24 running. Optional ones help us improve the experience and
              show relevant promotions. Read our{" "}
              <Link to="/cookies" className="text-primary hover:underline">Cookies Policy</Link>.
            </p>
          </div>
          <button
            aria-label="Reject optional cookies"
            onClick={rejectOptional}
            className="text-muted-foreground transition hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {customizing && (
          <div className="mt-4 space-y-2 rounded-xl border border-white/40 bg-white/60 p-3 dark:border-white/10 dark:bg-white/5">
            <CategoryRow
              icon={<ShieldCheck className="h-4 w-4" />}
              title="Essential"
              description="Required for sign-in, security, and core marketplace features."
              checked
              disabled
              onChange={() => undefined}
            />
            <CategoryRow
              icon={<BarChart3 className="h-4 w-4" />}
              title="Analytics"
              description="Anonymous usage data so we can improve the product."
              checked={analytics}
              onChange={setAnalytics}
            />
            <CategoryRow
              icon={<Megaphone className="h-4 w-4" />}
              title="Marketing"
              description="Helps us measure and personalize promotions."
              checked={marketing}
              onChange={setMarketing}
            />
          </div>
        )}

        <div className="mt-3 flex flex-wrap justify-end gap-2">
          {!customizing ? (
            <Button
              size="sm"
              variant="ghost"
              className="rounded-full"
              onClick={() => setCustomizing(true)}
            >
              Customize
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="rounded-full"
              onClick={() => setCustomizing(false)}
            >
              Hide options
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="rounded-full bg-white/70"
            onClick={rejectOptional}
          >
            Reject optional
          </Button>
          {customizing && (
            <Button
              size="sm"
              variant="outline"
              className="rounded-full bg-white/70"
              onClick={savePreferences}
            >
              Save preferences
            </Button>
          )}
          <Button
            size="sm"
            className="btn-gradient rounded-full border-0"
            onClick={acceptAll}
          >
            Accept all
          </Button>
        </div>
      </div>
    </div>
  );
}

function CategoryRow({
  icon,
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
        {icon}
      </div>
      <div className="flex-1 text-sm">
        <div className="font-medium">{title}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
        aria-label={`Toggle ${title} cookies`}
      />
    </div>
  );
}
