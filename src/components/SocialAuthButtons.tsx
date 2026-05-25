import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Provider = "google" | "apple";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C41 35.6 44 30.3 44 24c0-1.3-.1-2.3-.4-3.5z"/>
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M16.365 1.43c0 1.14-.42 2.24-1.11 3.03-.74.84-1.95 1.49-2.97 1.41-.13-1.11.42-2.27 1.07-3.01.74-.83 2.01-1.45 3.01-1.43zM20.5 17.4c-.55 1.27-.81 1.84-1.52 2.96-.99 1.56-2.39 3.51-4.12 3.53-1.54.02-1.93-1-4.02-.99-2.09.01-2.52 1.01-4.06.99-1.73-.02-3.06-1.78-4.05-3.34C.05 16.79-.24 11.41 1.45 8.55c1.2-2.03 3.1-3.22 4.88-3.22 1.82 0 2.96 1 4.46 1 1.46 0 2.35-1 4.46-1 1.59 0 3.28.87 4.48 2.36-3.94 2.16-3.3 7.78.77 9.71z"/>
    </svg>
  );
}

export function SocialAuthButtons({ redirect = "/" }: { redirect?: string }) {
  const [loading, setLoading] = useState<Provider | null>(null);

  const handleSignIn = async (provider: Provider) => {
    setLoading(provider);
    const redirectTo = `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });
    if (error) {
      setLoading(null);
      toast.error(error.message);
    }
  };

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        className="w-full bg-white/80 hover:bg-white"
        onClick={() => handleSignIn("google")}
        disabled={loading !== null}
      >
        <GoogleIcon />
        <span className="ml-2">{loading === "google" ? "Redirecting…" : "Continue with Google"}</span>
      </Button>
      <Button
        type="button"
        className="w-full bg-black text-white hover:bg-black/90"
        onClick={() => handleSignIn("apple")}
        disabled={loading !== null}
      >
        <AppleIcon />
        <span className="ml-2">{loading === "apple" ? "Redirecting…" : "Continue with Apple"}</span>
      </Button>
      <div className="relative py-2">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-white/40" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white/65 px-2 text-muted-foreground">Or with email</span>
        </div>
      </div>
    </div>
  );
}
