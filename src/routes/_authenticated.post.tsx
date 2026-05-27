import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/RichTextEditor";
import { BrandLoader } from "@/components/BrandLoader";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ImagePlus, X, Sparkles, Loader2, Check, ChevronsUpDown, Star, GripVertical } from "lucide-react";
import { aiWriteListing } from "@/lib/ai.functions";
import { chargeListingPost, getPromotionPricing, getWallet, promoteWithWallet } from "@/lib/wallet.functions";
import { Rocket, TrendingUp, Wallet as WalletIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DndContext, PointerSensor, TouchSensor, KeyboardSensor,
  useSensor, useSensors, closestCenter, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, arrayMove, useSortable, rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const postSearchSchema = z.object({ edit: z.string().uuid().optional() });

export const Route = createFileRoute("/_authenticated/post")({
  head: () => ({ meta: [{ title: "Post a listing — CallEscort24" }] }),
  validateSearch: postSearchSchema,
  component: PostListing,
});

const PHONE_RE = /^\+?\d[\d\s\-]{6,31}$/;
const sanitizePhone = (v: string) => v.replace(/[^\d+\s\-]/g, "").replace(/(?!^)\+/g, "");
const sanitizeAge = (v: string) => v.replace(/\D/g, "").slice(0, 2);

type ImgItem =
  | { kind: "existing"; key: string; id: string; url: string }
  | { kind: "new"; key: string; file: File; previewUrl: string };

type Errors = Partial<Record<
  "title" | "description" | "itemAge" | "phone" | "whatsapp" | "category" | "city" | "photos",
  string
>>;

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").trim();

function PostListing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { edit: editId } = Route.useSearch();
  const isEdit = !!editId;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [itemAge, setItemAge] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [waSame, setWaSame] = useState(true);

  const [categoryId, setCategoryId] = useState("");
  const [country, setCountry] = useState<"US" | "UK" | "CA" | "">("");
  const [cityIds, setCityIds] = useState<string[]>([]);
  const [originalCityIds, setOriginalCityIds] = useState<string[]>([]);
  // Map city_id -> sibling listing id (only in edit mode)
  const [siblingByCity, setSiblingByCity] = useState<Record<string, string>>({});
  const [groupId, setGroupId] = useState<string | null>(null);

  const [cityOpen, setCityOpen] = useState(false);
  const [images, setImages] = useState<ImgItem[]>([]);
  const [imagesDirty, setImagesDirty] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [aiHint, setAiHint] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const writeListingFn = useServerFn(aiWriteListing);

  // Boost selection (create-only)
  const [boostFeatured, setBoostFeatured] = useState(false);
  const [boostBump, setBoostBump] = useState(false);

  const { data: pricing } = useQuery({
    queryKey: ["promotion-pricing"],
    enabled: !isEdit,
    queryFn: () => getPromotionPricing(),
    staleTime: 5 * 60 * 1000,
  });
  const { data: walletData } = useQuery({
    queryKey: ["wallet-balance-postform"],
    enabled: !isEdit && !!user,
    queryFn: () => getWallet(),
  });

  const formRef = useRef<HTMLFormElement>(null);
  const newKeyRef = useRef(0);
  const nextKey = () => `new-${++newKeyRef.current}-${Date.now()}`;

  // Load existing listing + siblings when editing
  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ["edit-listing", editId],
    enabled: isEdit && !!user,
    queryFn: async () => {
      const { data: base, error } = await supabase
        .from("listings")
        .select(`id, user_id, title, description, item_age, phone, whatsapp,
          category_id, city_id, listing_group_id, cities(country)`)
        .eq("id", editId!)
        .maybeSingle();
      if (error) throw error;
      if (!base) throw new Error("Listing not found");
      if (base.user_id !== user!.id) throw new Error("Not your listing");

      const gid = (base as any).listing_group_id ?? base.id;
      const { data: siblings } = await supabase
        .from("listings")
        .select("id, city_id")
        .eq("listing_group_id", gid)
        .eq("user_id", user!.id);

      const { data: imgs } = await supabase
        .from("listing_images")
        .select("id, url, sort_order")
        .eq("listing_id", editId!)
        .order("sort_order");

      return { base, siblings: siblings ?? [], imgs: imgs ?? [], groupId: gid };
    },
  });

  useEffect(() => {
    if (!existing) return;
    const b = existing.base as any;
    setTitle(b.title ?? "");
    setDescription(b.description ?? "");
    setItemAge(b.item_age ?? "");
    setPhone(b.phone ?? "");
    setWhatsapp(b.whatsapp ?? "");
    setWaSame((b.whatsapp ?? "") === (b.phone ?? "") || !b.whatsapp);
    setCategoryId(b.category_id ?? "");
    if (b.cities?.country) setCountry(b.cities.country);
    setGroupId(existing.groupId);
    const sMap: Record<string, string> = {};
    existing.siblings.forEach((s: any) => { sMap[s.city_id] = s.id; });
    setSiblingByCity(sMap);
    const ids = existing.siblings.map((s: any) => s.city_id);
    setCityIds(ids);
    setOriginalCityIds(ids);
    setImages(
      (existing.imgs as any[]).map((r) => ({
        kind: "existing" as const, key: `ex-${r.id}`, id: r.id, url: r.url,
      })),
    );
  }, [existing]);

  const fileToDataUrl = (f: File) =>
    new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(f);
    });

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

  const runAi = async () => {
    if (!aiHint.trim()) return toast.error("Add a short hint first");
    setAiLoading(true);
    try {
      const categoryName = categories?.find((c) => c.id === categoryId)?.name;
      let imageDataUrl: string | undefined;
      const firstNew = images.find((i) => i.kind === "new") as Extract<ImgItem, { kind: "new" }> | undefined;
      if (firstNew && firstNew.file.size < 2_000_000) {
        imageDataUrl = await fileToDataUrl(firstNew.file);
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

  const toggleCity = (id: string) =>
    setCityIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const MAX_PHOTOS = 5;
  const totalPhotos = images.length;
  const onFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files ?? []);
    const remaining = MAX_PHOTOS - totalPhotos;
    if (remaining <= 0) {
      e.target.value = "";
      return;
    }
    const added = list.slice(0, remaining).map<ImgItem>((f) => ({
      kind: "new", key: nextKey(), file: f, previewUrl: URL.createObjectURL(f),
    }));
    setImages((prev) => [...prev, ...added]);
    setImagesDirty(true);
    e.target.value = "";
  };

  const removeImage = (key: string) => {
    setImages((prev) => {
      const removed = prev.find((p) => p.key === key);
      if (removed?.kind === "new") URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((p) => p.key !== key);
    });
    setImagesDirty(true);
  };

  const setAsCover = (key: string) => {
    setImages((prev) => {
      const idx = prev.findIndex((p) => p.key === key);
      if (idx <= 0) return prev;
      const next = [...prev];
      const [item] = next.splice(idx, 1);
      next.unshift(item);
      return next;
    });
    setImagesDirty(true);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setImages((prev) => {
      const oldIdx = prev.findIndex((p) => p.key === active.id);
      const newIdx = prev.findIndex((p) => p.key === over.id);
      if (oldIdx < 0 || newIdx < 0) return prev;
      return arrayMove(prev, oldIdx, newIdx);
    });
    setImagesDirty(true);
  };

  const validate = (): Errors => {
    const e: Errors = {};
    const t = title.trim();
    if (t.length < 3) e.title = "Title must be at least 3 characters";
    else if (t.length > 140) e.title = "Title must be 140 characters or less";
    const descText = stripHtml(description);
    if (descText.length < 10) e.description = "Description must be at least 10 characters";
    const age = itemAge.trim();
    if (!age) e.itemAge = "Age is required";
    else if (!/^\d+$/.test(age)) e.itemAge = "Age must be a number";
    else if (parseInt(age, 10) < 18) e.itemAge = "Age must be at least 18";
    else if (parseInt(age, 10) > 99) e.itemAge = "Age must be 99 or less";
    const ph = phone.trim();
    const phDigits = ph.replace(/\D/g, "");
    if (!PHONE_RE.test(ph) || phDigits.length < 7) e.phone = "Enter a valid phone number (digits only, e.g. +1 555 123 4567)";
    if (!waSame) {
      const w = whatsapp.trim();
      const wDigits = w.replace(/\D/g, "");
      if (w && (!PHONE_RE.test(w) || wDigits.length < 7)) e.whatsapp = "Enter a valid WhatsApp number (digits only)";
    }
    if (!categoryId) e.category = "Pick a category";
    if (cityIds.length === 0) e.city = "Pick at least one city";
    const oversize = images.find((i) => i.kind === "new" && i.file.size > 5_000_000);
    if (oversize) e.photos = "One or more photos exceed 5MB";
    return e;
  };

  const scrollToFirstError = () => {
    const node = formRef.current?.querySelector<HTMLElement>("[data-error='true']");
    node?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return toast.error("Sign in first");

    const eMap = validate();
    setErrors(eMap);
    if (Object.keys(eMap).length > 0) {
      toast.error("Please fix the highlighted fields");
      setTimeout(scrollToFirstError, 50);
      return;
    }

    const phoneTrim = phone.trim();
    const waTrim = waSame ? phoneTrim : whatsapp.trim();

    setSubmitting(true);
    try {
      // Upload new files once → URL list (shared across siblings)
      const stamp = Date.now();
      const newImageUrls = new Map<string, string>(); // key -> public url
      const newItems = images.filter((i) => i.kind === "new") as Extract<ImgItem, { kind: "new" }>[];
      for (let i = 0; i < newItems.length; i++) {
        const item = newItems[i];
        const ext = item.file.name.split(".").pop() || "jpg";
        const path = `${user.id}/shared/${stamp}-${i}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("listing-images").upload(path, item.file, { upsert: false });
        if (upErr) { console.error(upErr); continue; }
        const { data: pub } = supabase.storage.from("listing-images").getPublicUrl(path);
        newImageUrls.set(item.key, pub.publicUrl);
      }

      // Build the ordered URL list (final image set, sorted)
      const orderedUrls: string[] = images.map((img) =>
        img.kind === "existing" ? img.url : (newImageUrls.get(img.key) ?? ""),
      ).filter(Boolean);

      const baseFields = {
        title: title.trim(),
        description: description.trim(),
        item_age: itemAge.trim(),
        category_id: categoryId,
        phone: phoneTrim,
        whatsapp: waTrim || null,
      };

      if (isEdit && editId) {
        const gid = groupId ?? editId;
        const keptCityIds = cityIds.filter((c) => originalCityIds.includes(c));
        const addedCityIds = cityIds.filter((c) => !originalCityIds.includes(c));
        const removedCityIds = originalCityIds.filter((c) => !cityIds.includes(c));

        // 1) Update existing kept siblings
        for (const cId of keptCityIds) {
          const sid = siblingByCity[cId];
          if (!sid) continue;
          const { error } = await supabase
            .from("listings")
            .update({ ...baseFields, city_id: cId } as any)
            .eq("id", sid);
          if (error) throw error;
        }

        // 2) Insert new siblings for added cities, sharing group id
        const createdSiblings: { id: string; city_id: string }[] = [];
        for (const cId of addedCityIds) {
          const { data: ins, error } = await supabase
            .from("listings")
            .insert({
              ...baseFields,
              user_id: user.id,
              city_id: cId,
              listing_group_id: gid,
              slug: "",
            } as any)
            .select("id, city_id")
            .single();
          if (error) throw error;
          createdSiblings.push(ins as any);
        }

        // 3) Delete removed siblings
        if (removedCityIds.length) {
          const idsToDelete = removedCityIds.map((c) => siblingByCity[c]).filter(Boolean);
          if (idsToDelete.length) {
            const { error } = await supabase.from("listings").delete().in("id", idsToDelete);
            if (error) throw error;
          }
        }

        // 4) Sync images across all current siblings (only if dirty OR new cities added)
        const allSiblingIds = [
          ...keptCityIds.map((c) => siblingByCity[c]).filter(Boolean),
          ...createdSiblings.map((s) => s.id),
        ];

        if (imagesDirty || addedCityIds.length > 0) {
          // Delete then insert fresh ordered rows per sibling
          if (allSiblingIds.length) {
            await supabase.from("listing_images").delete().in("listing_id", allSiblingIds);
          }
          if (orderedUrls.length && allSiblingIds.length) {
            const rows = allSiblingIds.flatMap((lid) =>
              orderedUrls.map((url, idx) => ({
                listing_id: lid, url, sort_order: idx,
              })),
            );
            await supabase.from("listing_images").insert(rows);
          }
        }

        toast.success(
          cityIds.length === 1 ? "Listing updated" : `Updated across ${cityIds.length} cities`,
        );
        navigate({ to: "/listings/$id", params: { id: editId } });
        return;
      }

      // CREATE path — generate group id so we can edit as one later
      const groupUuid = crypto.randomUUID();

      // Charge wallet for posting (per city)
      try {
        await chargeListingPost({ data: { cityCount: cityIds.length, reference: groupUuid } });
      } catch (err: any) {
        toast.error(err?.message ?? "Wallet charge failed");
        setSubmitting(false);
        return;
      }

      const created: { id: string; slug: string | null }[] = [];
      for (const cId of cityIds) {
        const { data: listing, error } = await supabase
          .from("listings")
          .insert({
            ...baseFields,
            user_id: user.id,
            city_id: cId,
            listing_group_id: groupUuid,
            slug: "",
          } as any)
          .select("id, slug")
          .single();
        if (error) throw error;
        created.push(listing as any);

        if (orderedUrls.length) {
          await supabase.from("listing_images").insert(
            orderedUrls.map((url, idx) => ({
              listing_id: (listing as any).id, url, sort_order: idx,
            })),
          );
        }
      }

      // Apply selected boosts to each created listing
      if (boostFeatured || boostBump) {
        for (const c of created) {
          if (boostFeatured) {
            try { await promoteWithWallet({ data: { listingId: c.id, type: "featured" } }); }
            catch (e: any) { toast.error(`Feature failed: ${e?.message ?? "error"}`); }
          }
          if (boostBump) {
            try { await promoteWithWallet({ data: { listingId: c.id, type: "bump" } }); }
            catch (e: any) { toast.error(`Bump failed: ${e?.message ?? "error"}`); }
          }
        }
      }

      toast.success(
        cityIds.length === 1 ? "Listing posted!" : `Posted to ${cityIds.length} cities!`,
      );
      const first = created[0];
      navigate({ to: "/listings/$id", params: { id: (first as any).slug ?? first.id } });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to post");
    } finally {
      setSubmitting(false);
    }
  };

  if (isEdit && loadingExisting) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-10">
        <BrandLoader variant="block" label="Loading listing" />
      </div>
    );
  }

  const errCls = (k: keyof Errors) => errors[k] ? "border-destructive ring-1 ring-destructive/30" : "";

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-display text-3xl font-bold md:text-4xl">
        {isEdit ? <>Edit <span className="gradient-text">listing</span></> : <>Post a <span className="gradient-text">listing</span></>}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {isEdit
          ? originalCityIds.length > 1
            ? `This listing is published in ${originalCityIds.length} cities. Changes apply to all of them.`
            : "Update the details below and save your changes."
          : "Reach buyers across the country in seconds."}
      </p>

      <form ref={formRef} onSubmit={submit} className="mt-6 space-y-5 rounded-3xl border border-white/40 bg-white/60 p-6 shadow-[var(--shadow-float)] backdrop-blur-xl">
        {!isEdit && (
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
        )}

        <div className="space-y-2" data-error={!!errors.title}>
          <Label htmlFor="title">Title</Label>
          <Input
            id="title" maxLength={140} value={title}
            onChange={(e) => { setTitle(e.target.value); if (errors.title) setErrors((p) => ({ ...p, title: undefined })); }}
            placeholder="e.g. 2019 Trek Marlin 7 — Like new"
            className={cn("bg-white/70", errCls("title"))}
          />
          {errors.title && <p className="text-xs font-medium text-destructive">{errors.title}</p>}
        </div>

        <div className="space-y-2" data-error={!!errors.description}>
          <Label htmlFor="desc">Description</Label>
          <div className={errors.description ? "rounded-lg ring-1 ring-destructive/40" : ""}>
            <RichTextEditor
              value={description}
              onChange={(v) => { setDescription(v); if (errors.description) setErrors((p) => ({ ...p, description: undefined })); }}
              maxLength={4000}
              placeholder="Condition, size, history, why you're selling…"
            />
          </div>
          {errors.description && <p className="text-xs font-medium text-destructive">{errors.description}</p>}
        </div>

        <div className="space-y-2" data-error={!!errors.itemAge}>
          <Label htmlFor="item-age">Age</Label>
          <Input
            id="item-age" inputMode="numeric" maxLength={2} value={itemAge}
            onChange={(e) => { setItemAge(sanitizeAge(e.target.value)); if (errors.itemAge) setErrors((p) => ({ ...p, itemAge: undefined })); }}
            placeholder="e.g. 25 (minimum 18)"
            className={cn("bg-white/70", errCls("itemAge"))}
          />
          {errors.itemAge && <p className="text-xs font-medium text-destructive">{errors.itemAge}</p>}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2" data-error={!!errors.phone}>
            <Label htmlFor="phone">Phone number</Label>
            <Input
              id="phone" inputMode="tel" maxLength={32} value={phone}
              onChange={(e) => { setPhone(sanitizePhone(e.target.value)); if (errors.phone) setErrors((p) => ({ ...p, phone: undefined })); }}
              placeholder="+1 555 123 4567"
              className={cn("bg-white/70", errCls("phone"))}
            />
            {errors.phone && <p className="text-xs font-medium text-destructive">{errors.phone}</p>}
          </div>
          <div className="space-y-2" data-error={!!errors.whatsapp}>
            <Label htmlFor="whatsapp">WhatsApp number</Label>
            <Input
              id="whatsapp" inputMode="tel" maxLength={32}
              value={waSame ? phone : whatsapp} disabled={waSame}
              onChange={(e) => { setWhatsapp(sanitizePhone(e.target.value)); if (errors.whatsapp) setErrors((p) => ({ ...p, whatsapp: undefined })); }}
              placeholder="+1 555 123 4567"
              className={cn("bg-white/70", errCls("whatsapp"))}
            />
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Checkbox checked={waSame} onCheckedChange={(v) => setWaSame(v === true)} />
              Same as phone number
            </label>
            {errors.whatsapp && <p className="text-xs font-medium text-destructive">{errors.whatsapp}</p>}
          </div>
        </div>


        <div className="space-y-2" data-error={!!errors.category}>
          <Label>Category</Label>
          <Select value={categoryId} onValueChange={(v) => { setCategoryId(v); if (errors.category) setErrors((p) => ({ ...p, category: undefined })); }}>
            <SelectTrigger className={cn("bg-white/70", errCls("category"))}><SelectValue placeholder="Pick a category" /></SelectTrigger>
            <SelectContent>
              {categories?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {errors.category && <p className="text-xs font-medium text-destructive">{errors.category}</p>}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Country</Label>
            <Select value={country} onValueChange={(v) => { setCountry(v as any); if (!isEdit) setCityIds([]); }}>
              <SelectTrigger className="bg-white/70"><SelectValue placeholder="Pick country" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="US">United States</SelectItem>
                <SelectItem value="UK">United Kingdom</SelectItem>
                <SelectItem value="CA">Canada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2" data-error={!!errors.city}>
            <Label>Cities (select one or more)</Label>
            <Popover open={cityOpen} onOpenChange={setCityOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button" variant="outline" role="combobox" disabled={!country}
                  className={cn("w-full justify-between bg-white/70 font-normal", errCls("city"))}
                >
                  <span className="truncate">
                    {cityIds.length === 0
                      ? (country ? "Search & pick" : "Select country first")
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
                            onSelect={() => { toggleCity(c.id); if (errors.city) setErrors((p) => ({ ...p, city: undefined })); }}
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
                {selectedCities.map((c) => {
                  const isOriginal = originalCityIds.includes(c.id);
                  const isNew = isEdit && !isOriginal;
                  return (
                    <span
                      key={c.id}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium",
                        isNew ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-white/60 bg-white/80",
                      )}
                    >
                      {c.name}
                      {isNew && <span className="text-[10px] font-bold">NEW</span>}
                      <button
                        type="button" onClick={() => toggleCity(c.id)}
                        className="rounded-full hover:bg-black/5"
                        aria-label={`Remove ${c.name}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
            {isEdit && originalCityIds.some((c) => !cityIds.includes(c)) && (
              <p className="text-xs font-medium text-amber-700">
                Saving will remove this listing from {originalCityIds.filter((c) => !cityIds.includes(c)).length} city(ies).
              </p>
            )}
            {!isEdit && cityIds.length > 1 && (
              <p className="text-xs text-muted-foreground">
                We'll post a copy of this listing in each selected city.
              </p>
            )}
            {errors.city && <p className="text-xs font-medium text-destructive">{errors.city}</p>}
          </div>
        </div>

        <div className="space-y-2" data-error={!!errors.photos}>
          <Label>Photos (up to {MAX_PHOTOS})</Label>
          <p className="text-xs text-muted-foreground">
            {isEdit
              ? `Drag to reorder. First photo is the cover. ${totalPhotos}/${MAX_PHOTOS} added.`
              : `First photo is the cover. ${totalPhotos}/${MAX_PHOTOS} added.`}
          </p>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={images.map((i) => i.key)} strategy={rectSortingStrategy}>
              <div className="flex flex-wrap gap-2">
                {images.map((img, idx) => (
                  <SortableTile
                    key={img.key}
                    img={img}
                    isCover={idx === 0}
                    onSetCover={() => setAsCover(img.key)}
                    onRemove={() => removeImage(img.key)}
                    draggable={isEdit}
                  />
                ))}
                {totalPhotos < MAX_PHOTOS && (
                  <label className="grid h-20 w-20 cursor-pointer place-items-center rounded-xl border border-dashed bg-white/50 text-muted-foreground transition hover:border-primary hover:text-primary">
                    <ImagePlus className="h-5 w-5" />
                    <input type="file" accept="image/*" multiple className="hidden" onChange={onFiles} />
                  </label>
                )}
              </div>
            </SortableContext>
          </DndContext>
          {errors.photos && <p className="text-xs font-medium text-destructive">{errors.photos}</p>}
        </div>


        {!isEdit && pricing && (() => {
          const n = Math.max(1, cityIds.length);
          const postFee = pricing.listingPostPrice * n;
          const featCost = boostFeatured ? pricing.featuredPrice * n : 0;
          const bumpCost = boostBump ? pricing.bumpPrice * n : 0;
          const total = Math.round((postFee + featCost + bumpCost) * 100) / 100;
          const balance = Number(walletData?.balance ?? 0);
          const insufficient = total > balance;
          const fmt = (v: number) => `$${v.toFixed(2)}`;
          return (
            <div className="space-y-3 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-purple-500/5 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Rocket className="h-4 w-4 text-primary" /> Promote this listing (optional)
              </div>
              <label className="flex items-start gap-3 rounded-xl border border-white/60 bg-white/60 p-3 cursor-pointer">
                <Checkbox checked={boostFeatured} onCheckedChange={(v) => setBoostFeatured(!!v)} className="mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium flex items-center gap-1"><Star className="h-3.5 w-3.5 text-amber-500" /> Feature this listing</span>
                    <span className="text-sm font-semibold">{fmt(pricing.featuredPrice)}{n > 1 ? ` × ${n}` : ""}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Highlight in featured row for {pricing.featuredDays} days.</p>
                </div>
              </label>
              <label className="flex items-start gap-3 rounded-xl border border-white/60 bg-white/60 p-3 cursor-pointer">
                <Checkbox checked={boostBump} onCheckedChange={(v) => setBoostBump(!!v)} className="mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5 text-primary" /> Bump to top</span>
                    <span className="text-sm font-semibold">{fmt(pricing.bumpPrice)}{n > 1 ? ` × ${n}` : ""}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Push to the top of recent listings.</p>
                </div>
              </label>

              <div className="space-y-1 rounded-xl bg-white/70 p-3 text-sm">
                <div className="flex justify-between"><span>Post fee ({n} {n === 1 ? "city" : "cities"})</span><span>{fmt(postFee)}</span></div>
                {boostFeatured && <div className="flex justify-between"><span>Featured</span><span>{fmt(featCost)}</span></div>}
                {boostBump && <div className="flex justify-between"><span>Bump</span><span>{fmt(bumpCost)}</span></div>}
                <div className="mt-1 flex justify-between border-t border-border/60 pt-1 font-semibold"><span>Total</span><span>{fmt(total)}</span></div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><WalletIcon className="h-3 w-3" /> Wallet balance</span>
                  <span className={insufficient ? "text-destructive font-medium" : ""}>{fmt(balance)}</span>
                </div>
                {insufficient && (
                  <p className="text-xs font-medium text-destructive">
                    Insufficient balance.{" "}
                    <a href="/wallet" className="underline">Top up your wallet</a>
                  </p>
                )}
              </div>
            </div>
          );
        })()}

        <Button
          type="submit"
          size="lg"
          className="btn-gradient w-full"
          disabled={
            submitting ||
            (!isEdit && !!pricing && (() => {
              const n = Math.max(1, cityIds.length);
              const total = pricing.listingPostPrice * n
                + (boostFeatured ? pricing.featuredPrice * n : 0)
                + (boostBump ? pricing.bumpPrice * n : 0);
              return total > Number(walletData?.balance ?? 0);
            })())
          }
        >
          {submitting
            ? (isEdit ? "Saving…" : "Posting…")
            : isEdit
              ? cityIds.length > 1 ? `Save across ${cityIds.length} cities` : "Save changes"
              : cityIds.length > 1 ? `Post to ${cityIds.length} cities` : "Post listing"}
        </Button>
      </form>
    </div>
  );
}

function SortableTile({
  img, isCover, onSetCover, onRemove, draggable,
}: {
  img: ImgItem;
  isCover: boolean;
  onSetCover: () => void;
  onRemove: () => void;
  draggable: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: img.key, disabled: !draggable });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    touchAction: draggable ? "none" : undefined,
  };

  const src = img.kind === "existing" ? img.url : img.previewUrl;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative h-20 w-20 overflow-hidden rounded-xl border ring-1 ring-white/40 shadow-[var(--shadow-float)]",
        isCover && "ring-2 ring-primary",
      )}
    >
      <img src={src} alt="" className="h-full w-full object-cover" />

      {isCover && (
        <span className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-1 py-0.5 text-center text-[10px] font-bold text-white">
          COVER
        </span>
      )}

      {/* Drag handle (edit only) */}
      {draggable && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="absolute left-0 top-0 cursor-grab rounded-br bg-black/60 p-0.5 text-white opacity-80 active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-3 w-3" />
        </button>
      )}

      {/* Set as cover */}
      {!isCover && (
        <button
          type="button"
          onClick={onSetCover}
          className="absolute bottom-0 left-0 rounded-tr bg-black/60 p-0.5 text-white opacity-0 transition group-hover:opacity-100"
          aria-label="Set as cover"
          title="Set as cover"
        >
          <Star className="h-3 w-3" />
        </button>
      )}

      {/* Remove */}
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-0 top-0 rounded-bl bg-black/60 p-0.5 text-white"
        aria-label="Remove"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
