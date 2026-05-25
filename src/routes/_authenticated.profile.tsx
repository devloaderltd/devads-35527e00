import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ImagePlus, Save, Star, Package, Calendar, ExternalLink } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { AccountSettingsCard } from "@/components/AccountSettingsCard";

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
      const { data } = await supabase
        .from("profiles")
        .select("display_name, bio, phone, avatar_url, country, city_id, created_at")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["profile-stats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [listingsRes, reviewsRes] = await Promise.all([
        supabase.from("listings").select("id, status", { count: "exact", head: false }).eq("user_id", user!.id),
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
    setCountry((profile.country as any) ?? "");
    setCityId(profile.city_id ?? "");
    setAvatarUrl(profile.avatar_url ?? null);
  }, [profile]);

  const { data: cities } = useQuery({
    queryKey: ["cities", country],
    enabled: !!country,
    queryFn: async () => {
      const { data } = await supabase
        .from("cities").select("id, name, region")
        .eq("country", country as any).order("name").limit(1000);
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
    },
    onError: (e: any) => toast.error(e.message),
  });

  const initials = (displayName || "?")
    .split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="container mx-auto max-w-3xl px-4 py-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">
            Your <span className="gradient-text">profile</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            How buyers see you across the marketplace.
          </p>
        </div>
        {user && (
          <Link
            to="/sellers/$id"
            params={{ id: user.id }}
            className="inline-flex items-center gap-1 rounded-full bg-white/60 px-3 py-1.5 text-xs font-medium text-primary backdrop-blur hover:bg-white"
          >
            <ExternalLink className="h-3.5 w-3.5" /> View public page
          </Link>
        )}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <StatTile
          icon={<Package className="h-4 w-4" />}
          label="Active listings"
          value={stats ? `${stats.active}` : "—"}
          hint={stats ? `${stats.total} total` : ""}
        />
        <StatTile
          icon={<Star className="h-4 w-4" />}
          label="Seller rating"
          value={stats?.ratingCount ? stats.ratingAvg.toFixed(1) : "—"}
          hint={stats?.ratingCount ? `${stats.ratingCount} review${stats.ratingCount === 1 ? "" : "s"}` : "No reviews yet"}
        />
        <StatTile
          icon={<Calendar className="h-4 w-4" />}
          label="Member since"
          value={profile?.created_at ? formatDistanceToNow(new Date(profile.created_at), { addSuffix: false }) : "—"}
          hint={profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : ""}
        />
      </div>

      <div className="iridescent-border mt-6 rounded-3xl border border-white/40 bg-white/65 p-6 shadow-[var(--shadow-float-lg)] backdrop-blur-2xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              className="h-20 w-20 rounded-2xl object-cover ring-2 ring-white/70 shadow-md"
            />
          ) : (
            <div
              className="grid h-20 w-20 place-items-center rounded-2xl text-2xl font-bold text-white shadow-md"
              style={{ background: "var(--gradient-primary)" }}
            >
              {initials}
            </div>
          )}
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={onAvatar}
            />
            <Button
              type="button"
              variant="outline"
              className="rounded-full bg-white/60"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              <ImagePlus className="mr-2 h-4 w-4" />
              {uploading ? "Uploading…" : avatarUrl ? "Change avatar" : "Upload avatar"}
            </Button>
            <p className="mt-1 text-xs text-muted-foreground">PNG or JPG, square works best.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="dn">Display name</Label>
            <Input
              id="dn"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={60}
              className="mt-1 rounded-full bg-white/70 backdrop-blur"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={500}
              rows={4}
              placeholder="Tell buyers about yourself…"
              className="mt-1 rounded-2xl bg-white/70 backdrop-blur"
            />
            <p className="mt-1 text-xs text-muted-foreground">{bio.length}/500</p>
          </div>
          <div>
            <Label htmlFor="phone">Phone (optional)</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={30}
              className="mt-1 rounded-full bg-white/70 backdrop-blur"
            />
          </div>
          <div>
            <Label>Country</Label>
            <Select value={country} onValueChange={(v) => { setCountry(v as any); setCityId(""); }}>
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
                  {cities?.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}, {c.region}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <Button
            className="btn-gradient rounded-full border-0"
            disabled={save.isPending}
            onClick={() => save.mutate()}
          >
            <Save className="mr-2 h-4 w-4" />
            {save.isPending ? "Saving…" : "Save profile"}
          </Button>
        </div>
      </div>

      <AccountSettingsCard />
    </div>
  );
}

function StatTile({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-white/40 bg-white/65 p-4 shadow-[var(--shadow-float)] backdrop-blur">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="grid h-6 w-6 place-items-center rounded-lg bg-primary/10 text-primary">{icon}</span>
        {label}
      </div>
      <div className="mt-1 font-display text-xl font-bold">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
