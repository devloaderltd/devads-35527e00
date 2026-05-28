import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

export type ReasonCode =
  | "spam" | "nudity" | "scam" | "harassment" | "illegal"
  | "duplicate" | "underage" | "misleading" | "other";

const REASONS: { code: ReasonCode; label: string }[] = [
  { code: "spam", label: "Spam" },
  { code: "nudity", label: "Nudity / explicit" },
  { code: "scam", label: "Scam or fraud" },
  { code: "harassment", label: "Harassment" },
  { code: "illegal", label: "Illegal content" },
  { code: "duplicate", label: "Duplicate" },
  { code: "underage", label: "Underage subject" },
  { code: "misleading", label: "Misleading" },
  { code: "other", label: "Other" },
];

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: (v: { reasonCode: ReasonCode; reasonNote?: string; notifyUser: boolean }) => void | Promise<void>;
};

export function ReasonDialog({ open, onOpenChange, title, description, confirmLabel = "Confirm", destructive, onConfirm }: Props) {
  const [reason, setReason] = useState<ReasonCode>("spam");
  const [note, setNote] = useState("");
  const [notify, setNotify] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      await onConfirm({ reasonCode: reason, reasonNote: note.trim() || undefined, notifyUser: notify });
      onOpenChange(false);
      setNote("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="mb-2 block text-sm">Reason</Label>
            <RadioGroup value={reason} onValueChange={(v) => setReason(v as ReasonCode)} className="grid grid-cols-2 gap-2">
              {REASONS.map((r) => (
                <label key={r.code} className="flex cursor-pointer items-center gap-2 rounded-md border border-border p-2 text-sm">
                  <RadioGroupItem value={r.code} id={`r-${r.code}`} />
                  <span>{r.label}</span>
                </label>
              ))}
            </RadioGroup>
          </div>
          <div>
            <Label htmlFor="reason-note" className="mb-1 block text-sm">Note (optional)</Label>
            <Textarea id="reason-note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={500} placeholder="Add context for the audit log…" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={notify} onCheckedChange={(v) => setNotify(!!v)} />
            <span>Notify the user</span>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} disabled={submitting} variant={destructive ? "destructive" : "default"}>
            {submitting ? "Working…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
