import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { MailCheck } from "lucide-react";

export const Route = createFileRoute("/verify-email")({
  validateSearch: (search: Record<string, unknown>) => ({
    email: typeof search.email === "string" ? search.email : "",
  }),
  head: () => ({ meta: [{ title: "Verify your email — CallEscort24" }] }),
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const { email: initialEmail } = Route.useSearch();
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);

  const onResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return toast.error("Enter your email to resend.");
    setLoading(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?verified=1` },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Verification email sent again.");
  };

  return (
    <div className="container mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-10">
      <div className="iridescent-border rounded-3xl border border-white/40 bg-white/65 p-8 shadow-[var(--shadow-float-lg)] backdrop-blur-2xl">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-lg">
          <MailCheck className="h-6 w-6" />
        </div>
        <h1 className="font-display text-3xl font-bold">
          Verify your <span className="gradient-text">email</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {initialEmail ? (
            <>
              We sent a verification link to <span className="font-semibold">{initialEmail}</span>.
              Click it to activate your account.
            </>
          ) : (
            <>Check your inbox for a verification link to activate your account.</>
          )}
        </p>

        <form onSubmit={onResend} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Didn't get it? Resend to:</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-white/70"
            />
          </div>
          <Button type="submit" className="btn-gradient w-full" disabled={loading}>
            {loading ? "Sending…" : "Resend verification email"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already verified?{" "}
          <Link to="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
