import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ImagePlus, X, Sparkles, Loader2, Check, ChevronsUpDown } from "lucide-react";
import { aiWriteListing } from "@/lib/ai.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/post")({
  head: () => ({ meta: [{ title: "Post a listing — CallEscort24" }] }),
  component: PostListing,
});

const PHONE_RE = /^[+\d][\d\s\-().]{5,31}$/;

function PostListing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [itemAge, setItemAge] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [waSame, setWaSame] = useState(true);

  const [categoryId, setCategoryId] = useState("");
  const [country, setCountry] = useState<"US" | "UK" | "CA" | "">("");
  const [cityIds, setCityIds] = useState<string[]>([]);
  const [cityOpen, setCityOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [aiHint, setAiHint] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const writeListingFn = useServerFn(aiWriteListing);

  const fileToDataUrl = (f: File) =>
    new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(f);
    });

  const runAi = async () => {
    if (!aiHint.trim()) return toast.error("Add a short hint first");
    setAiLoading(true);
    try {
      const categoryName = categories?.find((c) => c.id === categoryId)?.name;
      let imageDataUrl: string | undefined;
      if (files[0] && files[0].size < 2_000_000) {
        imageDataUrl = await fileToDataUrl(files[0]);
      }
      const out = await writeListingFn({ data: { hint: aiHint.trim(), category: categoryName, imageDataUrl } });
      if (out.title) setTitle(out.title.slice(0, 140));
      if (out.description) setDescription(out.description);
      toast.success("Draft generated — edit before posting");
    } catch (e: any) {
      toast.error(e?.message ?? "AI failed");
    } finally {
      setAiLoading(false);
    }
  };

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

  const selectedCities = useMemo(
    () => (cities ?? []).filter((c) => cityIds.includes(c.id)),
    [cities, cityIds],
  );

  const toggleCity = (id: string) =>
    setCityIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const MAX_PHOTOS = 5;
  const onFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files ?? []).slice(0, MAX_PHOTOS - files.length);
    setFiles((prev) => [...prev, ...list].slice(0, MAX_PHOTOS));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return toast.error("Sign in first");
    if (!categoryId) return toast.error("Pick a category");
    if (cityIds.length === 0) return toast.error("Pick at least one city");
    const ageTrimmed = itemAge.trim();
    if (!ageTrimmed) return toast.error("Age is required");
    if (ageTrimmed.length > 60) return toast.error("Age must be 60 characters or less");
    const phoneTrim = phone.trim();
    if (!PHONE_RE.test(phoneTrim)) return toast.error("Enter a valid phone number");
    const waTrim = (waSame ? phoneTrim : whatsapp.trim());
    if (waTrim && !PHONE_RE.test(waTrim)) return toast.error("Enter a valid WhatsApp number");

    setSubmitting(true);
    try {
      // Upload images ONCE under the user's folder (reused across all city duplicates).
      const uploaded: { url: string; sort_order: number }[] = [];
      const stamp = Date.now();
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const ext = f.name.split(".").pop();
        const path = `${user.id}/shared/${stamp}-${i}.${ext}`;
        const { error: upErr } = await supabase.storage.from("listing-images").upload(path, f, { upsert: false });
        if (upErr) { console.error(upErr); continue; }
        const { data: pub } = supabase.storage.from("listing-images").getPublicUrl(path);
        uploaded.push({ url: pub.publicUrl, sort_order: i });
      }

      const created: { id: string; slug: string | null }[] = [];
      for (const cId of cityIds) {
        const { data: listing, error } = await supabase
          .from("listings")
          .insert({
            user_id: user.id,
            title: title.trim(),
            description: description.trim(),
            item_age: ageTrimmed,
            category_id: categoryId,
            city_id: cId,
            phone: phoneTrim,
            whatsapp: waTrim || null,
            slug: "",
          } as any)
          .select("id, slug")
          .single();
        if (error) throw error;
        created.push(listing as any);

        if (uploaded.length) {
          await supabase.from("listing_images").insert(
            uploaded.map((u) => ({ listing_id: (listing as any).id, url: u.url, sort_order: u.sort_order })),
          );
        }
      }

      toast.success(
        cityIds.length === 1
          ? "Listing posted!"
          : `Posted to ${cityIds.length} cities!`,
      );
      const first = created[0];
      navigate({ to: "/listings/$id", params: { id: (first as any).slug ?? first.id } });
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
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-purple-500/5 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-primary" /> AI listing writer
          </div>
          <p className="mb-2 text-xs text-muted-foreground">
            Add a quick hint (and optionally a photo above) and we'll draft a title + description for you.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={aiHint}
              onChange={(e) => setAiHint(e.target.value)}
              maxLength={400}
              placeholder='e.g. "Sony WH-1000XM4 headphones, used 6 months, all accessories"'
              className="bg-white/80"
            />
            <Button type="button" onClick={runAi} disabled={aiLoading} className="btn-gradient shrink-0">
              {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />}
              {aiLoading ? "Writing…" : "Generate"}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" required maxLength={140} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. 2019 Trek Marlin 7 — Like new" className="bg-white/70" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="desc">Description</Label>
          <Textarea id="desc" required rows={6} maxLength={4000} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Condition, size, history, why you're selling…" className="bg-white/70" />
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone number</Label>
            <Input
              id="phone"
              required
              inputMode="tel"
              maxLength={32}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555 123 4567"
              className="bg-white/70"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="whatsapp">WhatsApp number</Label>
            <Input
              id="whatsapp"
              inputMode="tel"
              maxLength={32}
              value={waSame ? phone : whatsapp}
              disabled={waSame}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="+1 555 123 4567"
              className="bg-white/70"
            />
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Checkbox
                checked={waSame}
                onCheckedChange={(v) => setWaSame(v === true)}
              />
              Same as phone number
            </label>
          </div>
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Country</Label>
            <Select value={country} onValueChange={(v) => { setCountry(v as any); setCityIds([]); }}>
              <SelectTrigger className="bg-white/70"><SelectValue placeholder="Pick country" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="US">United States</SelectItem>
                <SelectItem value="UK">United Kingdom</SelectItem>
                <SelectItem value="CA">Canada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Cities (select one or more)</Label>
            <Popover open={cityOpen} onOpenChange={setCityOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  disabled={!country}
                  className="w-full justify-between bg-white/70 font-normal"
                >
                  <span className="truncate">
                    {cityIds.length === 0
                      ? (country ? "Search & pick cities" : "Select country first")
                      : `${cityIds.length} selected`}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Type to search cities…" />
                  <CommandList className="max-h-64">
                    <CommandEmpty>No cities found.</CommandEmpty>
                    <CommandGroup>
                      {cities?.map((c) => {
                        const checked = cityIds.includes(c.id);
                        return (
                          <CommandItem
                            key={c.id}
                            value={`${c.name} ${c.region}`}
                            onSelect={() => toggleCity(c.id)}
                          >
                            <Check className={cn("mr-2 h-4 w-4", checked ? "opacity-100" : "opacity-0")} />
                            <span className="truncate">{c.name}, {c.region}</span>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {selectedCities.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {selectedCities.map((c) => (
                  <span
                    key={c.id}
                    className="inline-flex items-center gap-1 rounded-full border border-white/60 bg-white/80 px-2.5 py-1 text-xs font-medium"
                  >
                    {c.name}
                    <button
                      type="button"
                      onClick={() => toggleCity(c.id)}
                      className="rounded-full hover:bg-black/5"
                      aria-label={`Remove ${c.name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {cityIds.length > 1 && (
              <p className="text-xs text-muted-foreground">
                We'll post a copy of this listing in each selected city.
              </p>
            )}
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
          {submitting ? "Posting…" : cityIds.length > 1 ? `Post to ${cityIds.length} cities` : "Post listing"}
        </Button>
      </form>
    </div>
  );
}
