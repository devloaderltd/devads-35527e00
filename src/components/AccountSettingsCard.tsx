import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Mail, ShieldCheck, KeyRound, LogOut, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { deleteOwnAccount } from "@/lib/account.functions";
import { TwoFactorSection } from "@/components/TwoFactorSection";
import { ConnectedAccountsSection } from "@/components/ConnectedAccountsSection";
import { NotificationPreferencesSection } from "@/components/NotificationPreferencesSection";

export function AccountSettingsCard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const deleteFn = useServerFn(deleteOwnAccount);

  const [pwOpen, setPwOpen] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [savingPw, setSavingPw] = useState(false);

  const [delOpen, setDelOpen] = useState(false);
  const [delConfirm, setDelConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [resending, setResending] = useState(false);
  const [signingOutAll, setSigningOutAll] = useState(false);

  const email = user?.email ?? "";
  const verified = !!user?.email_confirmed_at;

  const resend = async () => {
    if (!email) return;
    setResending(true);
    const { error } = await supabase.auth.resend({ type: "signup", email });
    setResending(false);
    if (error) toast.error(error.message);
    else toast.success("Verification email sent");
  };

  const changePassword = async () => {
    if (newPw.length < 8) return toast.error("Password must be at least 8 characters");
    if (newPw !== confirmPw) return toast.error("Passwords don't match");
    setSavingPw(true);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setSavingPw(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    setPwOpen(false);
    setNewPw(""); setConfirmPw("");
  };

  const signOutAll = async () => {
    setSigningOutAll(true);
    const { error } = await supabase.auth.signOut({ scope: "global" });
    setSigningOutAll(false);
    if (error) return toast.error(error.message);
    toast.success("Signed out everywhere");
    navigate({ to: "/" });
  };

  const deleteAccount = async () => {
    if (delConfirm !== email) return toast.error("Email does not match");
    setDeleting(true);
    try {
      await deleteFn();
      await supabase.auth.signOut();
      toast.success("Account deleted");
      navigate({ to: "/" });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to delete account");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="iridescent-border mt-6 rounded-3xl border border-white/40 bg-white/65 p-6 shadow-[var(--shadow-float-lg)] backdrop-blur-2xl">
      <h2 className="font-display text-xl font-bold">Account settings</h2>
      <p className="mt-1 text-sm text-muted-foreground">Manage email, security, and sign-out.</p>

      {/* Email */}
      <section className="mt-5 border-t border-white/40 pt-5">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <Mail className="h-3.5 w-3.5" /> Email
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-medium">{email}</span>
          {verified ? (
            <Badge className="gap-1 rounded-full bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
              <ShieldCheck className="h-3 w-3" /> Verified
            </Badge>
          ) : (
            <Badge variant="outline" className="rounded-full border-amber-300 bg-amber-50 text-amber-800">
              Not verified
            </Badge>
          )}
          {!verified && (
            <Button size="sm" variant="outline" className="ml-auto rounded-full bg-white/60" disabled={resending} onClick={resend}>
              {resending ? "Sending…" : "Resend verification"}
            </Button>
          )}
        </div>
      </section>

      {/* Security */}
      <section className="mt-5 border-t border-white/40 pt-5">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <KeyRound className="h-3.5 w-3.5" /> Security
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm">
            <div className="font-medium">Password</div>
            <div className="text-xs text-muted-foreground">Choose a strong password you don't use anywhere else.</div>
          </div>
          <Dialog open={pwOpen} onOpenChange={setPwOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="rounded-full bg-white/60">Change password</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Change password</DialogTitle>
                <DialogDescription>Enter a new password of at least 8 characters.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-3">
                <div>
                  <Label htmlFor="np">New password</Label>
                  <Input id="np" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} className="mt-1" autoComplete="new-password" />
                </div>
                <div>
                  <Label htmlFor="cp">Confirm new password</Label>
                  <Input id="cp" type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} className="mt-1" autoComplete="new-password" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setPwOpen(false)}>Cancel</Button>
                <Button onClick={changePassword} disabled={savingPw} className="btn-gradient border-0">
                  {savingPw ? "Saving…" : "Update password"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </section>

      {/* Sessions */}
      <section className="mt-5 border-t border-white/40 pt-5">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <LogOut className="h-3.5 w-3.5" /> Sessions
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm">
            <div className="font-medium">Sign out of all devices</div>
            <div className="text-xs text-muted-foreground">Ends every active session across browsers and devices.</div>
          </div>
          <Button variant="outline" className="rounded-full bg-white/60" disabled={signingOutAll} onClick={signOutAll}>
            {signingOutAll ? "Signing out…" : "Sign out everywhere"}
          </Button>
        </div>
      </section>

      <TwoFactorSection />
      <ConnectedAccountsSection />
      <NotificationPreferencesSection />

      {/* Danger zone */}
      <section className="mt-5 rounded-2xl border border-red-200/70 bg-red-50/60 p-4">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-red-700">
          <AlertTriangle className="h-3.5 w-3.5" /> Danger zone
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm">
            <div className="font-medium text-red-900">Delete account</div>
            <div className="text-xs text-red-700/80">Permanently removes your profile, listings, and messages.</div>
          </div>
          <Dialog open={delOpen} onOpenChange={(o) => { setDelOpen(o); if (!o) setDelConfirm(""); }}>
            <DialogTrigger asChild>
              <Button variant="destructive" className="rounded-full">
                <Trash2 className="mr-2 h-4 w-4" /> Delete account
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Delete your account?</DialogTitle>
                <DialogDescription>
                  This action is permanent. To confirm, type your email <span className="font-mono">{email}</span> below.
                </DialogDescription>
              </DialogHeader>
              <Input
                value={delConfirm}
                onChange={(e) => setDelConfirm(e.target.value)}
                placeholder={email}
                autoComplete="off"
              />
              <DialogFooter>
                <Button variant="ghost" onClick={() => setDelOpen(false)}>Cancel</Button>
                <Button variant="destructive" disabled={deleting || delConfirm !== email} onClick={deleteAccount}>
                  {deleting ? "Deleting…" : "Delete forever"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </section>
    </div>
  );
}
