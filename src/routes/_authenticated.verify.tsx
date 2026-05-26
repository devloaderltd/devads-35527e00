import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { submitKyc, getMyKyc } from "@/lib/kyc.functions";
import { PanelShell } from "@/components/PanelShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, ShieldCheck, CheckCircle2, Clock, XCircle, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/verify")({
  head: () => ({ meta: [{ title: "Verify identity — KYC" }, { name: "robots", content: "noindex" }] }),
  component: VerifyPage,
});

type DocType = "passport" | "id_card" | "drivers_license";

function VerifyPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const getMy = useServerFn(getMyKyc);
  const submit = useServerFn(submitKyc);

  const { data: cur, isLoading } = useQuery({
    queryKey: ["my-kyc"],
    queryFn: () => getMy(),
  });

  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [docType, setDocType] = useState<DocType>("passport");
  const [docFront, setDocFront] = useState<string | null>(null);
  const [docBack, setDocBack] = useState<string | null>(null);
  const [selfie, setSelfie] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);

  const handleUpload = async (slot: "front" | "back" | "selfie", file: File) => {
    if (!user) return;
    if (file.size > 8 * 1024 * 1024) { toast.error("Max 8 MB"); return; }
    setUploading(slot);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/${slot}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("kyc-documents").upload(path, file, { upsert: true });
      if (error) throw error;
      if (slot === "front") setDocFront(path);
      if (slot === "back") setDocBack(path);
      if (slot === "selfie") setSelfie(path);
      toast.success("Uploaded");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(null);
    }
  };

  const submitMut = useMutation({
    mutationFn: async () => {
      return submit({
        data: {
          fullName,
          docType,
          docFrontUrl: docFront!,
          docBackUrl: docBack,
          selfieUrl: selfie!,
        },
      });
    },
    onSuccess: () => {
      toast.success("Submitted! We'll review within 24–48 hours.");
      qc.invalidateQueries({ queryKey: ["my-kyc"] });
      qc.invalidateQueries({ queryKey: ["profile-completion"] });
      setStep(1);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sub = cur?.submission;
  const isBlocked = sub && (sub.status === "pending" || sub.status === "approved");

  return (
    <PanelShell
      title="Verify your"
      highlight="identity"
      subtitle="Earn a $5 wallet bonus on approval. Used only for trust & safety."
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : isBlocked ? (
        <StatusCard sub={sub!} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <Card className="rounded-2xl border-0 bg-white/70 backdrop-blur dark:bg-white/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Step {step} of 3
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {step === 1 && (
                <>
                  <div>
                    <Label>Full legal name</Label>
                    <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="As it appears on your ID" />
                  </div>
                  <div>
                    <Label>Document type</Label>
                    <Select value={docType} onValueChange={(v) => setDocType(v as DocType)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="passport">Passport</SelectItem>
                        <SelectItem value="id_card">National ID card</SelectItem>
                        <SelectItem value="drivers_license">Driver's license</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={() => setStep(2)} disabled={fullName.trim().length < 2} className="btn-gradient border-0">
                      Next <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <UploadSlot label="ID front" path={docFront} uploading={uploading === "front"}
                    onFile={(f) => handleUpload("front", f)} />
                  {docType !== "passport" && (
                    <UploadSlot label="ID back" path={docBack} uploading={uploading === "back"}
                      onFile={(f) => handleUpload("back", f)} />
                  )}
                  <div className="flex justify-between">
                    <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                    <Button onClick={() => setStep(3)} disabled={!docFront || (docType !== "passport" && !docBack)} className="btn-gradient border-0">
                      Next <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <UploadSlot label="Selfie holding your ID" path={selfie} uploading={uploading === "selfie"}
                    onFile={(f) => handleUpload("selfie", f)} />
                  <p className="text-xs text-muted-foreground">
                    By submitting, you confirm the documents are genuine and belong to you. False submissions may lead to account suspension.
                  </p>
                  <div className="flex justify-between">
                    <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
                    <Button
                      onClick={() => submitMut.mutate()}
                      disabled={!selfie || submitMut.isPending}
                      className="btn-gradient border-0"
                    >
                      {submitMut.isPending ? "Submitting…" : "Submit for review"}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-0 bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-500/20 dark:to-amber-500/5">
            <CardContent className="p-5">
              <div className="text-2xl font-bold gradient-text">+ $5.00</div>
              <p className="mt-1 text-sm text-foreground/80">Wallet bonus credited automatically when an admin approves your submission.</p>
              <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                <li>• Use bonus to promote your listings</li>
                <li>• Get a "Verified" badge on your profile</li>
                <li>• Higher visibility & buyer trust</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </PanelShell>
  );
}

function StatusCard({ sub }: { sub: NonNullable<Awaited<ReturnType<typeof getMyKyc>>["submission"]> }) {
  const map = {
    pending: { icon: <Clock className="h-5 w-5" />, color: "text-amber-600", label: "Pending review" },
    approved: { icon: <CheckCircle2 className="h-5 w-5" />, color: "text-emerald-600", label: "Approved" },
    rejected: { icon: <XCircle className="h-5 w-5" />, color: "text-rose-600", label: "Rejected" },
  } as const;
  const m = map[(sub.status as keyof typeof map) ?? "pending"];
  return (
    <Card className="rounded-2xl border-0 bg-white/70 backdrop-blur dark:bg-white/5">
      <CardContent className="p-6 space-y-3">
        <div className={`flex items-center gap-2 ${m.color}`}>
          {m.icon}
          <span className="font-display text-xl font-bold">{m.label}</span>
          <Badge variant="outline" className="ml-2 capitalize">{sub.doc_type.replace("_", " ")}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Submitted {format(new Date(sub.created_at), "MMM d, yyyy 'at' HH:mm")}
        </p>
        {sub.status === "approved" && sub.bonus_credited && (
          <p className="text-sm font-medium text-emerald-600">$5 bonus credited to your wallet 🎉</p>
        )}
        {sub.review_note && (
          <div className="rounded-xl border border-border/40 bg-muted/30 p-3 text-sm">
            <p className="text-xs uppercase text-muted-foreground">Reviewer note</p>
            <p className="mt-1">{sub.review_note}</p>
          </div>
        )}
        {sub.status === "approved" && (
          <Button asChild className="btn-gradient border-0"><Link to="/wallet">View wallet</Link></Button>
        )}
      </CardContent>
    </Card>
  );
}

function UploadSlot({ label, path, uploading, onFile }: { label: string; path: string | null; uploading: boolean; onFile: (f: File) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <label className={`mt-1 flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed p-6 text-sm transition ${
        path ? "border-emerald-400 bg-emerald-50/50 dark:bg-emerald-500/5" : "border-border hover:border-primary/50"
      }`}>
        <Upload className="h-5 w-5 text-muted-foreground" />
        <span className="text-muted-foreground">
          {uploading ? "Uploading…" : path ? "Uploaded ✓ (click to replace)" : "Click to upload (JPG/PNG, max 8 MB)"}
        </span>
        <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
      </label>
    </div>
  );
}
