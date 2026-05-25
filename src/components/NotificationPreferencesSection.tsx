import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell } from "lucide-react";
import { toast } from "sonner";

type Prefs = {
  email_on_message: boolean;
  email_on_expiring: boolean;
  email_on_offer: boolean;
};

export function NotificationPreferencesSection() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<Prefs>({
    email_on_message: true,
    email_on_expiring: true,
    email_on_offer: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("notification_preferences")
        .select("email_on_message, email_on_expiring, email_on_offer")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) setPrefs(data);
      setLoading(false);
    })();
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("notification_preferences")
      .upsert({ user_id: user.id, ...prefs }, { onConflict: "user_id" });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Preferences saved");
  };

  const Row = ({ k, label, hint }: { k: keyof Prefs; label: string; hint: string }) => (
    <div className="flex items-center justify-between gap-3 py-2">
      <div>
        <Label htmlFor={k} className="text-sm font-medium">{label}</Label>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>
      <Switch
        id={k}
        checked={prefs[k]}
        onCheckedChange={(v) => setPrefs((p) => ({ ...p, [k]: !!v }))}
      />
    </div>
  );

  return (
    <section className="mt-5 border-t border-white/40 pt-5">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Bell className="h-3.5 w-3.5" /> Email notifications
      </div>
      {loading ? (
        <div className="mt-2 text-sm text-muted-foreground">Loading…</div>
      ) : (
        <>
          <Row k="email_on_message" label="New messages" hint="When a buyer or seller replies in a thread." />
          <Row k="email_on_expiring" label="Listing expiring" hint="3 days before a listing expires." />
          <Row k="email_on_offer" label="Offers & price changes" hint="When someone makes you an offer." />
          <div className="mt-3 flex justify-end">
            <Button className="btn-gradient rounded-full border-0" disabled={saving} onClick={save}>
              {saving ? "Saving…" : "Save preferences"}
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
