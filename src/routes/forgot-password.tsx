import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Reset password — CallEscort24" }] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    setSent(true);
    toast.success("Reset link sent — check your inbox.");
  };

  return (
    <div className="container mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-10">
      <div className="iridescent-border rounded-3xl border border-white/40 bg-white/65 p-8 shadow-[var(--shadow-float-lg)] backdrop-blur-2xl">
        <h1 className="font-display text-3xl font-bold">
          Forgot <span className="gradient-text">password?</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter your email and we'll send you a link to reset it.
        </p>

        {sent ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm">
              We sent a password reset link to <span className="font-semibold">{email}</span>.
              Click the link in the email to choose a new password.
            </div>
            <p className="text-xs text-muted-foreground">
              Didn't get it? Check your spam folder or{" "}
              <button
                type="button"
                onClick={() => setSent(false)}
                className="text-primary hover:underline"
              >
                try another address
              </button>
              .
            </p>
            <Link to="/login" className="block text-center text-sm text-primary hover:underline">
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
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
                {loading ? "Sending…" : "Send reset link"}
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Remembered it?{" "}
              <Link to="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
