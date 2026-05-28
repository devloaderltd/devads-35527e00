import { LogIn, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onClose: () => void;
  redirect?: string;
};

export function SessionExpiredDialog({ open, onClose, redirect }: Props) {
  const handleSignIn = () => {
    const r = redirect || (typeof window !== "undefined" ? window.location.pathname + window.location.search : "/");
    window.location.assign(`/login?redirect=${encodeURIComponent(r)}`);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Your session expired</DialogTitle>
          <DialogDescription>
            For your security, please sign in again to continue.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose} className="gap-2">
            <X className="h-4 w-4" /> Dismiss
          </Button>
          <Button onClick={handleSignIn} className="gap-2">
            <LogIn className="h-4 w-4" /> Sign in again
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
