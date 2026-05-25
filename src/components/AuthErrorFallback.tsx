import { Lock, RefreshCw, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { isForbiddenError } from "@/lib/auth-errors";

type Props = {
  error?: unknown;
  reset?: () => void;
  variant?: "default" | "admin";
};

export function AuthErrorFallback({ error, reset, variant = "default" }: Props) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const forbidden = isForbiddenError(error);

  const goSignIn = () => {
    if (variant === "admin") {
      navigate({ to: "/admin/login", search: { redirect: "/admin" }, replace: true });
    } else {
      navigate({ to: "/login", search: { redirect: pathname }, replace: true });
    }
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Lock className="h-6 w-6 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">
          {forbidden ? "Access denied" : "Please sign in"}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {forbidden
            ? "Your account doesn't have permission to view this page."
            : "Your session has expired or you're not signed in. Please sign in to continue."}
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button onClick={goSignIn} className="gap-2">
            <LogIn className="h-4 w-4" />
            Sign in
          </Button>
          {reset && (
            <Button variant="outline" onClick={reset} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
