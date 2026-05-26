import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdmin } from "./admin-middleware";

const uuid = z.string().uuid();

async function audit(actor: string, action: string, target_type: string, target_id: string, metadata: Record<string, unknown> = {}) {
  await supabaseAdmin.rpc("log_admin_action", {
    _actor: actor, _action: action, _target_type: target_type, _target_id: target_id, _metadata: metadata as never,
  });
}

/* ============== Listing events (analytics) ============== */

export const logListingEvent = createServerFn({ method: "POST" })
  .inputValidator((input: { listingId: string; type: "view" | "favorite" | "message" | "contact_reveal" }) => {
    if (!uuid.safeParse(input.listingId).success) throw new Error("Invalid listingId");
    if (!["view", "favorite", "message", "contact_reveal"].includes(input.type)) throw new Error("Invalid type");
    return input;
  })
  .handler(async ({ data }) => {
    // Optional user (anonymous allowed)
    let userId: string | null = null;
    try {
      // attempt to read auth header for user_id
      // safely ignore failure for anonymous events
    } catch { /* ignore */ }
    await supabaseAdmin.from("listing_events").insert({
      listing_id: data.listingId, user_id: userId, type: data.type,
    });
    return { ok: true };
  });

export const getMyListingAnalytics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { days?: number }) => ({ days: Math.min(90, Math.max(7, Math.floor(input.days ?? 30))) }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const since = new Date(Date.now() - data.days * 86400000).toISOString();
    const { data: listings } = await supabase
      .from("listings").select("id, title, view_count, status").eq("user_id", userId);
    const ids = (listings ?? []).map((l) => l.id);
    if (!ids.length) return { listings: [], events: [], totalsByType: {}, daily: [] };
    const { data: events } = await supabaseAdmin
      .from("listing_events").select("listing_id, type, created_at").in("listing_id", ids).gte("created_at", since);
    const evs = events ?? [];
    const totalsByType: Record<string, number> = {};
    evs.forEach((e) => { totalsByType[e.type] = (totalsByType[e.type] ?? 0) + 1; });
    // daily series
    const days: { date: string; views: number; favorites: number; messages: number; contacts: number }[] = [];
    for (let i = data.days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString().slice(0, 10);
      const dayEvs = evs.filter((e) => e.created_at.slice(0, 10) === key);
      days.push({
        date: key,
        views: dayEvs.filter((e) => e.type === "view").length,
        favorites: dayEvs.filter((e) => e.type === "favorite").length,
        messages: dayEvs.filter((e) => e.type === "message").length,
        contacts: dayEvs.filter((e) => e.type === "contact_reveal").length,
      });
    }
    return { listings: listings ?? [], events: evs, totalsByType, daily: days };
  });

/* ============== Saved searches ============== */

const filtersSchema = z.object({
  q: z.string().max(100).optional(),
  category: z.string().max(60).optional(),
  city: z.string().max(60).optional(),
  country: z.string().max(8).optional(),
  condition: z.string().max(40).optional(),
  sort: z.string().max(20).optional(),
}).strict();

export const listSavedSearches = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("saved_searches").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { items: data ?? [] };
  });

export const createSavedSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { name: string; filters: Record<string, unknown>; notify?: boolean }) => ({
    name: String(input.name ?? "").slice(0, 80).trim() || "Saved search",
    filters: filtersSchema.parse(input.filters ?? {}),
    notify: input.notify !== false,
  }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("saved_searches").insert({
      user_id: context.userId, name: data.name, query: (data.filters.q as string) ?? "",
      filters: data.filters, notify: data.notify,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteSavedSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => { if (!uuid.safeParse(input.id).success) throw new Error("Invalid id"); return input; })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("saved_searches").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleSavedSearchAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; notify: boolean }) => { if (!uuid.safeParse(input.id).success) throw new Error("Invalid id"); return input; })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("saved_searches").update({ notify: data.notify }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const renameSavedSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; name: string }) => {
    if (!uuid.safeParse(input.id).success) throw new Error("Invalid id");
    const name = String(input.name ?? "").slice(0, 80).trim();
    if (!name) throw new Error("Name is required");
    return { id: input.id, name };
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("saved_searches").update({ name: data.name }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });


/* ============== Notifications ============== */

export const listMyNotifications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { limit?: number; offset?: number }) => ({
    limit: Math.min(100, Math.max(1, Math.floor(input.limit ?? 20))),
    offset: Math.max(0, Math.floor(input.offset ?? 0)),
  }))
  .handler(async ({ data, context }) => {
    const { data: rows, error, count } = await context.supabase
      .from("notifications").select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);
    if (error) throw new Error(error.message);
    return { items: rows ?? [], total: count ?? 0 };
  });

export const getUnreadCount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { count } = await context.supabase
      .from("notifications").select("id", { count: "exact", head: true }).is("read_at", null);
    return { count: count ?? 0 };
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id?: string; all?: boolean }) => input)
  .handler(async ({ data, context }) => {
    let q = context.supabase.from("notifications").update({ read_at: new Date().toISOString() });
    q = data.all ? q.is("read_at", null) : q.eq("id", data.id!);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => { if (!uuid.safeParse(input.id).success) throw new Error("Invalid id"); return input; })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("notifications").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============== Seller reviews ============== */

export const listSellerReviews = createServerFn({ method: "POST" })
  .inputValidator((input: { sellerId: string }) => { if (!uuid.safeParse(input.sellerId).success) throw new Error("Invalid sellerId"); return input; })
  .handler(async ({ data }) => {
    const { data: rows } = await supabaseAdmin
      .from("seller_reviews").select("*").eq("seller_id", data.sellerId).order("created_at", { ascending: false });
    const reviewerIds = [...new Set((rows ?? []).map((r) => r.reviewer_id))];
    const { data: profiles } = reviewerIds.length
      ? await supabaseAdmin.from("profiles").select("id, display_name, avatar_url, kyc_status").in("id", reviewerIds)
      : { data: [] as { id: string; display_name: string; avatar_url: string | null; kyc_status: string }[] };
    const items = (rows ?? []).map((r) => {
      const p = profiles?.find((p) => p.id === r.reviewer_id) ?? null;
      return {
        ...r,
        reviewer: p,
        reviewer_verified: p?.kyc_status === "approved",
      };
    });
    const avg = items.length ? items.reduce((s, r) => s + r.rating, 0) / items.length : 0;
    return { items, avg, count: items.length };
  });

export const canReviewSeller = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { sellerId: string }) => { if (!uuid.safeParse(input.sellerId).success) throw new Error("Invalid sellerId"); return input; })
  .handler(async ({ data, context }) => {
    if (data.sellerId === context.userId) return { canReview: false, reason: "self" };
    const { data: threads } = await context.supabase
      .from("message_threads").select("id").eq("seller_id", data.sellerId).eq("buyer_id", context.userId).limit(1);
    if (!threads || !threads.length) return { canReview: false, reason: "no_thread" };
    return { canReview: true };
  });

export const submitSellerReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { sellerId: string; rating: number; body?: string; listingId?: string; photoUrls?: string[] }) => {
    if (!uuid.safeParse(input.sellerId).success) throw new Error("Invalid sellerId");
    if (input.rating < 1 || input.rating > 5) throw new Error("Rating must be 1-5");
    const photos = Array.isArray(input.photoUrls)
      ? input.photoUrls.filter((u) => typeof u === "string" && /^https?:\/\//.test(u)).slice(0, 4)
      : [];
    return {
      sellerId: input.sellerId,
      rating: Math.round(input.rating),
      body: String(input.body ?? "").slice(0, 1000),
      listingId: input.listingId && uuid.safeParse(input.listingId).success ? input.listingId : null,
      photoUrls: photos,
    };
  })
  .handler(async ({ data, context }) => {
    if (data.sellerId === context.userId) throw new Error("Cannot review yourself");
    const { error } = await context.supabase.from("seller_reviews").upsert({
      seller_id: data.sellerId, reviewer_id: context.userId, listing_id: data.listingId,
      rating: data.rating, body: data.body || null,
      photo_urls: data.photoUrls,
    }, { onConflict: "seller_id,reviewer_id,listing_id" });
    if (error) throw new Error(error.message);
    // Notify seller
    await supabaseAdmin.from("notifications").insert({
      user_id: data.sellerId, type: "review",
      title: "New review", body: `You received a ${data.rating}★ review`,
      link: `/sellers/${data.sellerId}`,
      metadata: { rating: data.rating },
    });
    return { ok: true };
  });

export const reportReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { reviewId: string; reason: string; details?: string }) => {
    if (!uuid.safeParse(input.reviewId).success) throw new Error("Invalid reviewId");
    return {
      reviewId: input.reviewId,
      reason: String(input.reason ?? "").slice(0, 100) || "Other",
      details: String(input.details ?? "").slice(0, 1000) || null,
    };
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("reports").insert({
      review_id: data.reviewId,
      reporter_id: context.userId,
      reason: data.reason,
      details: data.details,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteMyReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { reviewId: string }) => {
    if (!uuid.safeParse(input.reviewId).success) throw new Error("Invalid reviewId");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("seller_reviews").delete().eq("id", data.reviewId).eq("reviewer_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMyReceivedReviews = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: rows } = await context.supabase
      .from("seller_reviews").select("*").eq("seller_id", context.userId).order("created_at", { ascending: false });
    const ids = [...new Set((rows ?? []).map((r) => r.reviewer_id))];
    const { data: profiles } = ids.length
      ? await supabaseAdmin.from("profiles").select("id, display_name, avatar_url").in("id", ids)
      : { data: [] as { id: string; display_name: string; avatar_url: string | null }[] };
    const items = (rows ?? []).map((r) => ({
      ...r,
      reviewer: profiles?.find((p) => p.id === r.reviewer_id) ?? null,
    }));
    const avg = items.length ? items.reduce((s, r) => s + r.rating, 0) / items.length : 0;
    const breakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    items.forEach((r) => { breakdown[r.rating] = (breakdown[r.rating] ?? 0) + 1; });
    return { items, avg, count: items.length, breakdown };
  });

export const listMyAuthoredReviews = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: rows } = await context.supabase
      .from("seller_reviews").select("*").eq("reviewer_id", context.userId).order("created_at", { ascending: false });
    const ids = [...new Set((rows ?? []).map((r) => r.seller_id))];
    const { data: profiles } = ids.length
      ? await supabaseAdmin.from("profiles").select("id, display_name, avatar_url").in("id", ids)
      : { data: [] as { id: string; display_name: string; avatar_url: string | null }[] };
    const items = (rows ?? []).map((r) => ({
      ...r,
      seller: profiles?.find((p) => p.id === r.seller_id) ?? null,
    }));
    return { items, count: items.length };
  });

export const respondToReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { reviewId: string; response: string }) => {
    if (!uuid.safeParse(input.reviewId).success) throw new Error("Invalid reviewId");
    const response = String(input.response ?? "").trim().slice(0, 1000);
    return { reviewId: input.reviewId, response };
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("seller_reviews")
      .update({ response: data.response || null, response_at: data.response ? new Date().toISOString() : null })
      .eq("id", data.reviewId)
      .eq("seller_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });


/* ============== Homepage slots & banners (admin) ============== */

export const listHomepageSlots = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data } = await supabaseAdmin.from("homepage_slots").select("*").order("position").order("sort_order");
    return { slots: data ?? [] };
  });

const slotSchema = z.object({
  id: z.string().uuid().optional(),
  position: z.enum(["hero", "featured", "banner"]),
  listing_id: z.string().uuid().nullable().optional(),
  image_url: z.string().max(500).nullable().optional(),
  title: z.string().max(120).nullable().optional(),
  subtitle: z.string().max(240).nullable().optional(),
  cta_label: z.string().max(40).nullable().optional(),
  cta_url: z.string().max(500).nullable().optional(),
  sort_order: z.number().int().min(0).max(999).optional(),
  active: z.boolean().optional(),
});

export const upsertHomepageSlot = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: unknown) => slotSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    if (id) {
      const { error } = await supabaseAdmin.from("homepage_slots").update(rest as never).eq("id", id);
      if (error) throw new Error(error.message);
      await audit(context.userId, "homepage.update", "homepage_slot", id, rest);
    } else {
      const { data: ins, error } = await supabaseAdmin.from("homepage_slots").insert(rest as never).select("id").single();
      if (error) throw new Error(error.message);
      await audit(context.userId, "homepage.create", "homepage_slot", ins.id, rest);
    }
    return { ok: true };
  });

export const deleteHomepageSlot = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: { id: string }) => { if (!uuid.safeParse(input.id).success) throw new Error("Invalid id"); return input; })
  .handler(async ({ data, context }) => {
    const { error } = await supabaseAdmin.from("homepage_slots").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await audit(context.userId, "homepage.delete", "homepage_slot", data.id);
    return { ok: true };
  });

export const listSiteBanners = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data } = await supabaseAdmin.from("site_banners").select("*").order("created_at", { ascending: false });
    return { banners: data ?? [] };
  });

export const activeBanner = createServerFn({ method: "GET" })
  .handler(async () => {
    const now = new Date().toISOString();
    const { data } = await supabaseAdmin
      .from("site_banners").select("*")
      .eq("active", true).lte("starts_at", now)
      .or(`ends_at.is.null,ends_at.gt.${now}`)
      .order("created_at", { ascending: false }).limit(1);
    return { banner: data?.[0] ?? null };
  });

const bannerSchema = z.object({
  id: z.string().uuid().optional(),
  message: z.string().min(1).max(280),
  cta_label: z.string().max(40).nullable().optional(),
  cta_url: z.string().max(500).nullable().optional(),
  variant: z.enum(["info", "success", "warning", "promo"]).optional(),
  active: z.boolean().optional(),
  starts_at: z.string().optional(),
  ends_at: z.string().nullable().optional(),
});

export const upsertSiteBanner = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: unknown) => bannerSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    if (id) {
      const { error } = await supabaseAdmin.from("site_banners").update(rest as never).eq("id", id);
      if (error) throw new Error(error.message);
      await audit(context.userId, "banner.update", "site_banner", id, rest);
    } else {
      const { data: ins, error } = await supabaseAdmin.from("site_banners").insert(rest as never).select("id").single();
      if (error) throw new Error(error.message);
      await audit(context.userId, "banner.create", "site_banner", ins.id, rest);
    }
    return { ok: true };
  });

export const deleteSiteBanner = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: { id: string }) => { if (!uuid.safeParse(input.id).success) throw new Error("Invalid id"); return input; })
  .handler(async ({ data, context }) => {
    const { error } = await supabaseAdmin.from("site_banners").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await audit(context.userId, "banner.delete", "site_banner", data.id);
    return { ok: true };
  });

/* ============== Bulk users (admin) ============== */

export const bulkUsersAction = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: { ids: string[]; action: "ban" | "unban" | "delete"; days?: number }) => {
    if (!Array.isArray(input.ids) || !input.ids.length || input.ids.length > 200) throw new Error("Invalid ids");
    for (const id of input.ids) if (!uuid.safeParse(id).success) throw new Error("Invalid id");
    if (!["ban", "unban", "delete"].includes(input.action)) throw new Error("Invalid action");
    return input;
  })
  .handler(async ({ data, context }) => {
    for (const id of data.ids) {
      if (id === context.userId) continue;
      if (data.action === "delete") {
        await supabaseAdmin.auth.admin.deleteUser(id);
      } else if (data.action === "ban") {
        await supabaseAdmin.auth.admin.updateUserById(id, { ban_duration: `${(data.days ?? 7) * 24}h` });
      } else {
        await supabaseAdmin.auth.admin.updateUserById(id, { ban_duration: "none" });
      }
    }
    await audit(context.userId, `user.bulk_${data.action}`, "user", "", { count: data.ids.length, ids: data.ids });
    return { ok: true };
  });

/* ============== Moderation queue ============== */

export const getModerationQueue = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { data: reports } = await supabaseAdmin
      .from("reports").select("*").eq("status", "open").order("created_at", { ascending: false }).limit(100);
    const listingIds = [...new Set((reports ?? []).map((r) => r.listing_id).filter((x): x is string => !!x))];
    const reporterIds = [...new Set((reports ?? []).map((r) => r.reporter_id))];
    const [{ data: listings }, { data: profiles }] = await Promise.all([
      listingIds.length ? supabaseAdmin.from("listings").select("id, title, status, user_id").in("id", listingIds) : Promise.resolve({ data: [] }),
      reporterIds.length ? supabaseAdmin.from("profiles").select("id, display_name").in("id", reporterIds) : Promise.resolve({ data: [] }),
    ]);
    return {
      reports: (reports ?? []).map((r) => ({
        ...r,
        listing: r.listing_id ? ((listings ?? []).find((l: { id: string }) => l.id === r.listing_id) ?? null) : null,
        reporter: (profiles ?? []).find((p: { id: string }) => p.id === r.reporter_id) ?? null,
      })),
    };
  });

export const moderateReport = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: { reportId: string; action: "approve" | "dismiss" | "remove_listing"; note?: string }) => {
    if (!uuid.safeParse(input.reportId).success) throw new Error("Invalid reportId");
    return { ...input, note: String(input.note ?? "").slice(0, 500) };
  })
  .handler(async ({ data, context }) => {
    const { data: report } = await supabaseAdmin.from("reports").select("*").eq("id", data.reportId).maybeSingle();
    if (!report) throw new Error("Report not found");
    const { data: listing } = report.listing_id
      ? await supabaseAdmin.from("listings").select("user_id, title").eq("id", report.listing_id).maybeSingle()
      : { data: null as { user_id: string; title: string } | null };
    if (data.action === "remove_listing") {
      if (report.listing_id) await supabaseAdmin.from("listings").update({ status: "removed" }).eq("id", report.listing_id);
      await supabaseAdmin.from("reports").update({ status: "resolved" }).eq("id", data.reportId);
      if (listing) await supabaseAdmin.from("notifications").insert({
        user_id: listing.user_id, type: "moderation",
        title: "Listing removed", body: `"${listing.title}" was removed: ${data.note || report.reason}`,
        metadata: { reason: report.reason, note: data.note },
      });
    } else if (data.action === "approve") {
      await supabaseAdmin.from("reports").update({ status: "resolved" }).eq("id", data.reportId);
    } else {
      await supabaseAdmin.from("reports").update({ status: "dismissed" }).eq("id", data.reportId);
    }
    await audit(context.userId, `moderation.${data.action}`, "report", data.reportId, { note: data.note });
    return { ok: true };
  });

/* ============== Homepage public read (composes everything) ============== */

export const getHomepageContent = createServerFn({ method: "GET" })
  .handler(async () => {
    const [{ data: slots }, { data: banner }] = await Promise.all([
      supabaseAdmin.from("homepage_slots").select("*").eq("active", true).order("position").order("sort_order"),
      supabaseAdmin.from("site_banners").select("*").eq("active", true).lte("starts_at", new Date().toISOString()).limit(1),
    ]);
    return { slots: slots ?? [], banner: banner?.[0] ?? null };
  });
