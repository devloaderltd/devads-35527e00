import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ImagePlus, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/post")({
  head: () => ({ meta: [{ title: "Post a listing — Marketly" }] }),
  component: PostListing,
});

function PostListing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [itemAge, setItemAge] = useState("");
  
  const [categoryId, setCategoryId] = useState("");
  const [country, setCountry] = useState<"US" | "UK" | "CA" | "">("");
  const [cityId, setCityId] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id, name").order("sort_order");
      return data ?? [];
    },
  });

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

  const MAX_PHOTOS = 5;
  const onFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files ?? []).slice(0, MAX_PHOTOS - files.length);
    setFiles((prev) => [...prev, ...list].slice(0, MAX_PHOTOS));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return toast.error("Sign in first");
    if (!categoryId || !cityId) return toast.error("Pick a category and city");
    const ageTrimmed = itemAge.trim();
    if (!ageTrimmed) return toast.error("Item age is required");
    if (ageTrimmed.length > 60) return toast.error("Item age must be 60 characters or less");
    setSubmitting(true);
    try {
      const { data: listing, error } = await supabase
        .from("listings")
        .insert({
          user_id: user.id,
          title: title.trim(),
          description: description.trim(),
          price: price ? Number(price) : null,
          currency,
          item_age: ageTrimmed,
          category_id: categoryId,
          city_id: cityId,
        })
        .select("id")
        .single();
      if (error) throw error;

      // upload images
      const uploaded: { url: string; sort_order: number }[] = [];
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const ext = f.name.split(".").pop();
        const path = `${user.id}/${listing.id}/${Date.now()}-${i}.${ext}`;
        const { error: upErr } = await supabase.storage.from("listing-images").upload(path, f, { upsert: false });
        if (upErr) { console.error(upErr); continue; }
        const { data: pub } = supabase.storage.from("listing-images").getPublicUrl(path);
        uploaded.push({ url: pub.publicUrl, sort_order: i });
      }
      if (uploaded.length) {
        await supabase.from("listing_images").insert(
          uploaded.map((u) => ({ listing_id: listing.id, url: u.url, sort_order: u.sort_order }))
        );
      }

      toast.success("Listing posted!");
      navigate({ to: "/listings/$id", params: { id: listing.id } });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to post");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-display text-3xl font-bold md:text-4xl">
        Post a <span className="gradient-text">listing</span>
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">Reach buyers across the country in seconds.</p>

      <form onSubmit={submit} className="mt-6 space-y-5 rounded-3xl border border-white/40 bg-white/60 p-6 shadow-[var(--shadow-float)] backdrop-blur-xl">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" required maxLength={140} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. 2019 Trek Marlin 7 — Like new" className="bg-white/70" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="desc">Description</Label>
          <Textarea id="desc" required rows={6} maxLength={4000} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Condition, size, history, why you're selling…" className="bg-white/70" />
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="space-y-2 col-span-2 sm:col-span-1">
            <Label>Price</Label>
            <Input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0 for free" className="bg-white/70" />
          </div>
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="bg-white/70"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD $</SelectItem>
                <SelectItem value="GBP">GBP £</SelectItem>
                <SelectItem value="CAD">CAD $</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="item-age">Age</Label>
          <Input
            id="item-age"
            required
            maxLength={60}
            value={itemAge}
            onChange={(e) => setItemAge(e.target.value)}
            placeholder="e.g. 2 years, 6 months, brand new"
            className="bg-white/70"
          />
        </div>


        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="bg-white/70"><SelectValue placeholder="Pick a category" /></SelectTrigger>
            <SelectContent>
              {categories?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Country</Label>
            <Select value={country} onValueChange={(v) => { setCountry(v as any); setCityId(""); }}>
              <SelectTrigger className="bg-white/70"><SelectValue placeholder="Pick country" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="US">United States</SelectItem>
                <SelectItem value="UK">United Kingdom</SelectItem>
                <SelectItem value="CA">Canada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>City</Label>
            <Select value={cityId} onValueChange={setCityId} disabled={!country}>
              <SelectTrigger className="bg-white/70"><SelectValue placeholder={country ? "Pick city" : "Select country first"} /></SelectTrigger>
              <SelectContent className="max-h-72">
                {cities?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}, {c.region}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Photos (up to {MAX_PHOTOS})</Label>
          <p className="text-xs text-muted-foreground">First photo is the cover. {files.length}/{MAX_PHOTOS} added.</p>
          <div className="flex flex-wrap gap-2">
            {files.map((f, i) => (
              <div key={i} className="relative h-20 w-20 overflow-hidden rounded-xl border ring-1 ring-white/40 shadow-[var(--shadow-float)]">
                <img src={URL.createObjectURL(f)} alt="" className="h-full w-full object-cover" />
                {i === 0 && (
                  <span className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5 text-center text-[10px] font-semibold text-white">
                    Cover
                  </span>
                )}
                <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} className="absolute right-0 top-0 rounded-bl bg-black/60 p-0.5 text-white">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {files.length < MAX_PHOTOS && (
              <label className="grid h-20 w-20 cursor-pointer place-items-center rounded-xl border border-dashed bg-white/50 text-muted-foreground transition hover:border-primary hover:text-primary">
                <ImagePlus className="h-5 w-5" />
                <input type="file" accept="image/*" multiple className="hidden" onChange={onFiles} />
              </label>
            )}
          </div>
        </div>

        <Button type="submit" size="lg" className="btn-gradient w-full" disabled={submitting}>
          {submitting ? "Posting…" : "Post listing"}
        </Button>
      </form>
    </div>
  );
}

