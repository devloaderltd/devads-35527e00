import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ImagePlus, Save, Star, Package, Calendar, ExternalLink,
  BadgeCheck, ShieldCheck, Clock, XCircle, Mail, Phone, CheckCircle2, Circle, ArrowRight,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { AccountSettingsCard } from "@/components/AccountSettingsCard";
import { PanelShell } from "@/components/PanelShell";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — CallEscort24" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ProfileEdit,
});

function ProfileEdit() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState<"US" | "UK" | "CA" | "">("");
  const [cityId, setCityId] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile-self", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [{ data }, { data: phoneVal }] = await Promise.all([
        supabase
          .from("profiles")
          .select("display_name, bio, avatar_url, country, city_id, created_at, kyc_status, kyc_verified_at, phone_verified_at, email_verified_at")
          .eq("id", user!.id)
          .maybeSingle(),
        supabase.rpc("get_my_phone"),
      ]);
      return data ? { ...data, phone: (phoneVal as string | null) ?? null } : null;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["profile-stats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [listingsRes, reviewsRes] = await Promise.all([
        supabase.from("listings").select("id, status").eq("user_id", user!.id),
        supabase.from("seller_reviews").select("rating").eq("seller_id", user!.id),
      ]);
      const all = listingsRes.data ?? [];
      const active = all.filter((l) => l.status === "active").length;
      const ratings = reviewsRes.data ?? [];
      const avg = ratings.length ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length : 0;
      return { total: all.length, active, ratingAvg: avg, ratingCount: ratings.length };
    },
  });

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.display_name ?? "");
    setBio(profile.bio ?? "");
    setPhone(profile.phone ?? "");
    setCountry((profile.country as "US" | "UK" | "CA" | null) ?? "");
    setCityId(profile.city_id ?? "");
    setAvatarUrl(profile.avatar_url ?? null);
  }, [profile]);

  const { data: cities } = useQuery({
    queryKey: ["cities", country],
    enabled: !!country,
    queryFn: async () => {
      const { data } = await supabase
        .from("cities").select("id, name, region")
        .eq("country", country as "US" | "UK" | "CA").order("name").limit(1000);
      return data ?? [];
    },
  });

  const onAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/avatars/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("listing-images")
      .upload(path, file, { cacheControl: "3600", upsert: false });
    if (upErr) {
      toast.error(upErr.message);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("listing-images").getPublicUrl(path);
    setAvatarUrl(data.publicUrl);
    setUploading(false);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      if (!displayName.trim()) throw new Error("Display name is required");
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName.trim(),
          bio: bio.trim() || null,
          phone: phone.trim() || null,
          country: country || null,
          city_id: cityId || null,
          avatar_url: avatarUrl,
        })
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile saved");
      qc.invalidateQueries({ queryKey: ["profile-self"] });
      qc.invalidateQueries({ queryKey: ["seller", user?.id] });
      qc.invalidateQueries({ queryKey: ["profile-completion"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const initials = (displayName || "?")
    .split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  const checklist = useMemo(() => {
    const items = [
      { key: "name", label: "Display name", done: !!displayName.trim() },
      { key: "avatar", label: "Profile photo", done: !!avatarUrl },
      { key: "bio", label: "Bio (40+ chars)", done: (bio?.trim().length ?? 0) >= 40 },
      { key: "location", label: "Country & city", done: !!country && !!cityId },
      { key: "phone", label: "Phone number", done: !!phone.trim() },
      { key: "kyc", label: "Identity verified (+$5)", done: profile?.kyc_status === "approved", reward: true },
    ];
    const done = items.filter((i) => i.done).length;
    return { items, done, total: items.length, pct: Math.round((done / items.length) * 100) };
  }, [displayName, avatarUrl, bio, country, cityId, phone, profile?.kyc_status]);

  const kycStatus = (profile?.kyc_status as string | undefined) ?? "none";

  return (
    <PanelShell
      title="Your"
      highlight="profile"
      subtitle="How buyers see you across the marketplace."
      size="lg"
      action={
        user && (
          <Link
            to="/sellers/$id"
            params={{ id: user.id }}
            className="inline-flex items-center gap-1 rounded-full bg-white/60 px-3 py-1.5 text-xs font-medium text-primary backdrop-blur hover:bg-white"
          >
            <ExternalLink className="h-3.5 w-3.5" /> View public page
          </Link>
        )
      }
    >
      {/* Hero / verification banner */}
      <Card className="rounded-3xl border-0 bg-gradient-to-br from-primary/10 via-white/70 to-fuchsia-100/40 backdrop-blur dark:from-primary/20 dark:via-white/5 dark:to-fuchsia-500/10">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-6">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-20 w-20 rounded-2xl object-cover ring-2 ring-white/70 shadow-md" />
          ) : (
            <div className="grid h-20 w-20 place-items-center rounded-2xl text-2xl font-bold text-white shadow-md" style={{ background: "var(--gradient-primary)" }}>
              {initials}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-xl font-bold">{displayName || "Unnamed seller"}</h2>
              {profile?.kyc_status === "approved" && (
                <Badge className="bg-emerald-600 hover:bg-emerald-600"><BadgeCheck className="mr-1 h-3 w-3" /> Verified</Badge>
              )}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {profile?.created_at ? `Member since ${new Date(profile.created_at).toLocaleDateString()}` : ""}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <VerifPill icon={<Mail className="h-3 w-3" />} label="Email" ok={!!profile?.email_verified_at} />
              <VerifPill icon={<Phone className="h-3 w-3" />} label="Phone" ok={!!profile?.phone_verified_at} />
              <VerifPill icon={<ShieldCheck className="h-3 w-3" />} label="Identity" ok={kycStatus === "approved"} pending={kycStatus === "pending"} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stat tiles */}
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <StatTile icon={<Package className="h-4 w-4" />} label="Active listings"
          value={stats ? `${stats.active}` : "—"} hint={stats ? `${stats.total} total` : ""} />
        <StatTile icon={<Star className="h-4 w-4" />} label="Seller rating"
          value={stats?.ratingCount ? stats.ratingAvg.toFixed(1) : "—"}
          hint={stats?.ratingCount ? `${stats.ratingCount} review${stats.ratingCount === 1 ? "" : "s"}` : "No reviews yet"} />
        <StatTile icon={<Calendar className="h-4 w-4" />} label="Member since"
          value={profile?.created_at ? formatDistanceToNow(new Date(profile.created_at), { addSuffix: false }) : "—"}
          hint={profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : ""} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        {/* Left: edit form */}
        <Card className="rounded-2xl border-0 bg-white/70 backdrop-blur dark:bg-white/5">
          <CardHeader>
            <CardTitle className="text-base">Edit details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={onAvatar} />
              <Button type="button" variant="outline" className="rounded-full bg-white/60" disabled={uploading} onClick={() => fileRef.current?.click()}>
                <ImagePlus className="mr-2 h-4 w-4" />
                {uploading ? "Uploading…" : avatarUrl ? "Change avatar" : "Upload avatar"}
              </Button>
              <p className="text-xs text-muted-foreground">PNG or JPG, square works best.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="dn">Display name</Label>
                <Input id="dn" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={60}
                  className="mt-1 rounded-full bg-white/70 backdrop-blur" />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500} rows={4}
                  placeholder="Tell buyers about yourself…" className="mt-1 rounded-2xl bg-white/70 backdrop-blur" />
                <p className="mt-1 text-xs text-muted-foreground">{bio.length}/500</p>
              </div>
              <div>
                <Label htmlFor="phone">Phone (optional)</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30}
                  className="mt-1 rounded-full bg-white/70 backdrop-blur" />
              </div>
              <div>
                <Label>Country</Label>
                <Select value={country} onValueChange={(v) => { setCountry(v as "US" | "UK" | "CA"); setCityId(""); }}>
                  <SelectTrigger className="mt-1 rounded-full bg-white/70 backdrop-blur">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="US">United States</SelectItem>
                    <SelectItem value="UK">United Kingdom</SelectItem>
                    <SelectItem value="CA">Canada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {country && (
                <div className="sm:col-span-2">
                  <Label>City</Label>
                  <Select value={cityId} onValueChange={setCityId}>
                    <SelectTrigger className="mt-1 rounded-full bg-white/70 backdrop-blur">
                      <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {cities?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}, {c.region}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button className="btn-gradient rounded-full border-0" disabled={save.isPending} onClick={() => save.mutate()}>
                <Save className="mr-2 h-4 w-4" />
                {save.isPending ? "Saving…" : "Save profile"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Right: KYC + checklist */}
        <div className="space-y-6">
          <KycCard status={kycStatus} verifiedAt={profile?.kyc_verified_at as string | null | undefined} />

          <Card className="rounded-2xl border-0 bg-white/70 backdrop-blur dark:bg-white/5">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-base">
                <span>Completion</span>
                <span className="font-display text-2xl font-bold gradient-text">{checklist.pct}%</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Progress value={checklist.pct} className="h-2" />
              <ul className="space-y-1.5">
                {checklist.items.map((it) => (
                  <li key={it.key} className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      {it.done
                        ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                        : <Circle className="h-4 w-4 shrink-0 text-muted-foreground/40" />}
                      <span className={it.done ? "text-muted-foreground line-through" : ""}>{it.label}</span>
                      {it.reward && !it.done && (
                        <Badge variant="secondary" className="ml-1 bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                          Bonus
                        </Badge>
                      )}
                    </span>
                    {!it.done && it.key === "kyc" && (
                      <Button asChild size="sm" variant="ghost" className="h-7 gap-1 text-xs">
                        <Link to="/verify">Verify <ArrowRight className="h-3 w-3" /></Link>
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-6">
        <AccountSettingsCard />
      </div>
    </PanelShell>
  );
}

function KycCard({ status, verifiedAt }: { status: string; verifiedAt?: string | null }) {
  const config = {
    approved: { icon: <BadgeCheck className="h-5 w-5" />, color: "text-emerald-600", label: "Identity verified", cta: "View status", desc: verifiedAt ? `Approved ${formatDistanceToNow(new Date(verifiedAt), { addSuffix: true })}` : "Your identity has been verified." },
    pending: { icon: <Clock className="h-5 w-5" />, color: "text-amber-600", label: "Verification pending", cta: "Check status", desc: "We'll review your submission within 24–48 hours." },
    rejected: { icon: <XCircle className="h-5 w-5" />, color: "text-rose-600", label: "Verification rejected", cta: "Resubmit", desc: "Please review the reviewer's note and submit again." },
    none: { icon: <ShieldCheck className="h-5 w-5" />, color: "text-primary", label: "Verify your identity", cta: "Start verification", desc: "Earn a $5 wallet bonus and a Verified badge on your profile." },
  } as const;
  const c = config[(status as keyof typeof config)] ?? config.none;
  return (
    <Card className="rounded-2xl border-0 bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-500/20 dark:to-amber-500/5">
      <CardContent className="p-5">
        <div className={`flex items-center gap-2 ${c.color}`}>
          {c.icon}
          <span className="font-display text-lg font-bold">{c.label}</span>
        </div>
        <p className="mt-1.5 text-sm text-foreground/80">{c.desc}</p>
        {status !== "approved" && (
          <div className="mt-1 text-2xl font-bold gradient-text">+ $5.00 bonus</div>
        )}
        <Button asChild className="btn-gradient mt-3 w-full rounded-full border-0">
          <Link to="/verify">
            <BadgeCheck className="mr-2 h-4 w-4" /> {c.cta}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function VerifPill({ icon, label, ok, pending }: { icon: React.ReactNode; label: string; ok: boolean; pending?: boolean }) {
  const cls = ok
    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300"
    : pending
    ? "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300"
    : "bg-muted text-muted-foreground";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}>
      {icon} {label} {ok ? "✓" : pending ? "·" : "—"}
    </span>
  );
}

function StatTile({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-white/40 bg-white/65 p-4 shadow-[var(--shadow-float)] backdrop-blur dark:border-white/10 dark:bg-white/5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="grid h-6 w-6 place-items-center rounded-lg bg-primary/10 text-primary">{icon}</span>
        {label}
      </div>
      <div className="mt-1 font-display text-xl font-bold">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
