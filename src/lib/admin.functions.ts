import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdmin } from "./admin-middleware";
import { runSeedDemo } from "./seed-demo.server";
import { enqueueTransactionalEmail, getUserEmail, getUserDisplayName } from "./email/enqueue.server";

const SITE_URL = "https://callescort.devloader.com";

/** Email a listing owner about an approval/rejection. Never throws. */
async function emailListingDecision(
  listingId: string,
  decision: "approved" | "rejected",
  reason?: string,
) {
  try {
    const { data: listing } = await supabaseAdmin
      .from("listings").select("id, title, owner_id, slug").eq("id", listingId).maybeSingle();
    if (!listing?.owner_id) return;
    const email = await getUserEmail(listing.owner_id);
    if (!email) return;
    const name = await getUserDisplayName(listing.owner_id);
    await enqueueTransactionalEmail({
      templateName: decision === "approved" ? "listing-approved" : "listing-rejected",
      recipientEmail: email,
      idempotencyKey: `listing-${decision}-${listingId}-${Date.now()}`,
      templateData: {
        recipientName: name ?? undefined,
        listingTitle: listing.title ?? undefined,
        reason,
        listingUrl: listing.slug
          ? `${SITE_URL}/listings/${listing.slug}`
          : `${SITE_URL}/dashboard/listings`,
        dashboardUrl: `${SITE_URL}/dashboard`,
      },
    });
  } catch (e) { console.error("listing decision email failed", e); }
}

const uuid = z.string().uuid();

async function audit(actor: string, action: string, target_type: string | null, target_id: string | null, metadata: Record<string, unknown> = {}) {
  await supabaseAdmin.rpc("log_admin_action", {
    _actor: actor,
    _action: action,
    _target_type: target_type ?? "",
    _target_id: target_id ?? "",
    _metadata: metadata as never,
  });
}

export const getMyRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (error) throw new Error(`Role check failed: ${error.message}`);
    return { roles: (data ?? []).map((r) => r.role as string) };
  });

export const runDemoSeed = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .handler(async ({ context }) => {
    const result = await runSeedDemo();
    await audit(context.userId, "demo.seed_rotate", "auth", null, {
      rotated: true,
      rotated_at: result.rotated_at,
      accounts: result.accounts.map(a => ({
        email: a.email,
        was_created: a.was_created,
        listings_seeded: a.listings_seeded,
      })),
    });
    return result;
  });

/* ---------------- Users ---------------- */

export const listUsersAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: { q?: string; filter?: "all" | "admins" | "moderators" | "banned"; page?: number; perPage?: number }) => ({
    q: (input.q ?? "").slice(0, 100).trim(),
    filter: input.filter ?? "all",
    page: Math.max(1, Math.floor(input.page ?? 1)),
    perPage: Math.min(100, Math.max(5, Math.floor(input.perPage ?? 25))),
  }))
  .handler(async ({ data }) => {
    // Scan up to N pages of auth users to support search/filter without a DB view.
    const MAX_SCAN = 5;
    const SCAN_PER_PAGE = 200;
    type AuthUser = Awaited<ReturnType<typeof supabaseAdmin.auth.admin.listUsers>>["data"]["users"][number];
    const collected: AuthUser[] = [];
    let scannedPages = 0;
    let exhausted = false;
    for (let p = 1; p <= MAX_SCAN; p++) {
      const { data: au, error } = await supabaseAdmin.auth.admin.listUsers({ page: p, perPage: SCAN_PER_PAGE });
      if (error) throw new Error(error.message);
      collected.push(...au.users);
      scannedPages = p;
      if (au.users.length < SCAN_PER_PAGE) { exhausted = true; break; }
    }

    const ids = collected.map((u) => u.id);
    const profilesRes = ids.length ? await supabaseAdmin.from("profiles").select("id, display_name, created_at, city_id").in("id", ids) : { data: [] };
    const rolesRes = ids.length ? await supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", ids) : { data: [] };
    const walletsRes = ids.length ? await supabaseAdmin.from("wallets").select("user_id, balance_usd").in("user_id", ids) : { data: [] };
    const profiles = profilesRes.data ?? [];
    const roles = rolesRes.data ?? [];
    const wallets = walletsRes.data ?? [];

    let out = collected.map((u) => {
      const profile = profiles.find((p) => p.id === u.id);
      const userRoles = roles.filter((r) => r.user_id === u.id).map((r) => r.role as string);
      const banned = !!u.banned_until && new Date(u.banned_until).getTime() > Date.now();
      const balance = Number(wallets.find((w) => w.user_id === u.id)?.balance_usd ?? 0);
      return {
        id: u.id,
        email: u.email ?? "",
        display_name: profile?.display_name ?? u.email?.split("@")[0] ?? "—",
        created_at: profile?.created_at ?? u.created_at,
        roles: userRoles,
        banned,
        banned_until: u.banned_until ?? null,
        wallet_balance: balance,
      };
    });

    if (data.q) {
      const q = data.q.toLowerCase();
      out = out.filter((u) => u.display_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    if (data.filter === "admins") out = out.filter((u) => u.roles.includes("admin"));
    else if (data.filter === "moderators") out = out.filter((u) => u.roles.includes("moderator"));
    else if (data.filter === "banned") out = out.filter((u) => u.banned);

    out.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const total = out.length;
    const start = (data.page - 1) * data.perPage;
    const slice = out.slice(start, start + data.perPage);
    return {
      users: slice,
      total,
      page: data.page,
      perPage: data.perPage,
      hasMore: start + slice.length < total,
      scannedPages,
      scanExhausted: exhausted,
    };
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: { userId: string; role: "admin" | "moderator"; add: boolean }) => {
    if (!uuid.safeParse(input.userId).success) throw new Error("Invalid userId");
    if (input.role !== "admin" && input.role !== "moderator") throw new Error("Invalid role");
    return input;
  })
  .handler(async ({ data, context }) => {
    if (data.add) {
      const { error } = await supabaseAdmin.from("user_roles").insert({ user_id: data.userId, role: data.role });
      if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId).eq("role", data.role);
      if (error) throw new Error(error.message);
    }
    await audit(context.userId, data.add ? "role.grant" : "role.revoke", "user", data.userId, { role: data.role });
    return { ok: true };
  });

export const banUser = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: { userId: string; days: number }) => {
    if (!uuid.safeParse(input.userId).success) throw new Error("Invalid userId");
    if (input.days < 1 || input.days > 36500) throw new Error("Invalid duration");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      ban_duration: `${data.days * 24}h`,
    });
    if (error) throw new Error(error.message);
    await audit(context.userId, "user.ban", "user", data.userId, { days: data.days });
    return { ok: true };
  });

export const unbanUser = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: { userId: string }) => {
    if (!uuid.safeParse(input.userId).success) throw new Error("Invalid userId");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, { ban_duration: "none" });
    if (error) throw new Error(error.message);
    await audit(context.userId, "user.unban", "user", data.userId);
    return { ok: true };
  });

export const deleteUserAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: { userId: string }) => {
    if (!uuid.safeParse(input.userId).success) throw new Error("Invalid userId");
    return input;
  })
  .handler(async ({ data, context }) => {
    if (data.userId === context.userId) throw new Error("You can't delete yourself");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    await audit(context.userId, "user.delete", "user", data.userId);
    return { ok: true };
  });

export const sendPasswordReset = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: { email: string }) => {
    if (!z.string().email().safeParse(input.email).success) throw new Error("Invalid email");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { error } = await supabaseAdmin.auth.admin.generateLink({ type: "recovery", email: data.email });
    if (error) throw new Error(error.message);
    await audit(context.userId, "user.password_reset", "user", data.email);
    return { ok: true };
  });

export const getUserSummary = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: { userId: string }) => {
    if (!uuid.safeParse(input.userId).success) throw new Error("Invalid userId");
    return input;
  })
  .handler(async ({ data }) => {
    const [statusRows, listingsCount, txCount, paymentsCount, threads] = await Promise.all([
      supabaseAdmin.from("listings").select("status").eq("user_id", data.userId),
      supabaseAdmin.from("listings").select("id", { count: "exact", head: true }).eq("user_id", data.userId),
      supabaseAdmin.from("wallet_transactions").select("id", { count: "exact", head: true }).eq("user_id", data.userId),
      supabaseAdmin.from("payments").select("id", { count: "exact", head: true }).eq("user_id", data.userId),
      supabaseAdmin.from("message_threads").select("id", { count: "exact", head: true }).or(`buyer_id.eq.${data.userId},seller_id.eq.${data.userId}`),
    ]);
    const statusCounts: Record<string, number> = {};
    for (const r of (statusRows.data ?? []) as { status: string }[]) {
      statusCounts[r.status] = (statusCounts[r.status] ?? 0) + 1;
    }
    return {
      statusCounts,
      listingsTotal: listingsCount.count ?? 0,
      walletTxsTotal: txCount.count ?? 0,
      paymentsTotal: paymentsCount.count ?? 0,
      threadsCount: threads.count ?? 0,
    };
  });

const pageInput = (input: { userId: string; offset?: number; limit?: number }) => {
  if (!uuid.safeParse(input.userId).success) throw new Error("Invalid userId");
  return {
    userId: input.userId,
    offset: Math.max(0, Math.floor(input.offset ?? 0)),
    limit: Math.min(100, Math.max(1, Math.floor(input.limit ?? 20))),
  };
};

export const getUserListingsPage = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator(pageInput)
  .handler(async ({ data }) => {
    const from = data.offset;
    const to = data.offset + data.limit - 1;
    const { data: rows, error, count } = await supabaseAdmin
      .from("listings")
      .select("id, title, status, price, currency, created_at, view_count", { count: "exact" })
      .eq("user_id", data.userId)
      .order("created_at", { ascending: false })
      .range(from, to);
    if (error) throw new Error(error.message);
    return { items: rows ?? [], total: count ?? 0, offset: data.offset, limit: data.limit };
  });

export const getUserWalletTxsPage = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator(pageInput)
  .handler(async ({ data }) => {
    const from = data.offset;
    const to = data.offset + data.limit - 1;
    const { data: rows, error, count } = await supabaseAdmin
      .from("wallet_transactions")
      .select("*", { count: "exact" })
      .eq("user_id", data.userId)
      .order("created_at", { ascending: false })
      .range(from, to);
    if (error) throw new Error(error.message);
    return { items: rows ?? [], total: count ?? 0, offset: data.offset, limit: data.limit };
  });

export const getUserPaymentsPage = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator(pageInput)
  .handler(async ({ data }) => {
    const from = data.offset;
    const to = data.offset + data.limit - 1;
    const { data: rows, error, count } = await supabaseAdmin
      .from("payments")
      .select("*", { count: "exact" })
      .eq("user_id", data.userId)
      .order("created_at", { ascending: false })
      .range(from, to);
    if (error) throw new Error(error.message);
    return { items: rows ?? [], total: count ?? 0, offset: data.offset, limit: data.limit };
  });

// Backward-compat: keep getUserDetails as a thin wrapper around the new paginated fns
// (some callers still import it). Returns the first page of each list.
export const getUserDetails = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: { userId: string }) => {
    if (!uuid.safeParse(input.userId).success) throw new Error("Invalid userId");
    return input;
  })
  .handler(async ({ data }) => {
    const [{ data: listings }, { data: payments }, { data: txs }, threads] = await Promise.all([
      supabaseAdmin.from("listings").select("id, title, status, price, currency, created_at, view_count").eq("user_id", data.userId).order("created_at", { ascending: false }).limit(50),
      supabaseAdmin.from("payments").select("*").eq("user_id", data.userId).order("created_at", { ascending: false }).limit(50),
      supabaseAdmin.from("wallet_transactions").select("*").eq("user_id", data.userId).order("created_at", { ascending: false }).limit(50),
      supabaseAdmin.from("message_threads").select("id", { count: "exact", head: true }).or(`buyer_id.eq.${data.userId},seller_id.eq.${data.userId}`),
    ]);
    return {
      listings: listings ?? [],
      payments: payments ?? [],
      walletTxs: txs ?? [],
      threadsCount: threads.count ?? 0,
    };
  });

/* ---------------- Wallets ---------------- */

export const adminAdjustWallet = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: { userId: string; amount: number; description: string }) => {
    if (!uuid.safeParse(input.userId).success) throw new Error("Invalid userId");
    if (typeof input.amount !== "number" || input.amount === 0) throw new Error("Amount must be non-zero");
    if (Math.abs(input.amount) > 100000) throw new Error("Amount out of range");
    if (!input.description || input.description.length > 200) throw new Error("Description required (≤200 chars)");
    return input;
  })
  .handler(async ({ data, context }) => {
    const amount = Math.round(data.amount * 100) / 100;
    const { error } = await supabaseAdmin.rpc("admin_adjust_wallet", {
      _user_id: data.userId,
      _amount: amount,
      _description: data.description,
    });
    if (error) throw new Error(error.message);
    await audit(context.userId, "wallet.adjust", "user", data.userId, { amount, description: data.description });
    return { ok: true };
  });

export const listWalletsAdmin = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { data: wallets } = await supabaseAdmin
      .from("wallets")
      .select("user_id, balance_usd, updated_at")
      .order("balance_usd", { ascending: false })
      .limit(200);
    const ids = (wallets ?? []).map((w) => w.user_id);
    const { data: profiles } = ids.length
      ? await supabaseAdmin.from("profiles").select("id, display_name").in("id", ids)
      : { data: [] as { id: string; display_name: string }[] };
    return {
      wallets: (wallets ?? []).map((w) => ({
        ...w,
        balance_usd: Number(w.balance_usd),
        display_name: profiles?.find((p) => p.id === w.user_id)?.display_name ?? "—",
      })),
    };
  });

/* ---------------- Top-ups ---------------- */

export const listTopupsAdmin = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { data } = await supabaseAdmin
      .from("crypto_topups")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    return { topups: data ?? [] };
  });

export const retryTopupCredit = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: { topupId: string }) => {
    if (!uuid.safeParse(input.topupId).success) throw new Error("Invalid topupId");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { data: t, error } = await supabaseAdmin.from("crypto_topups").select("*").eq("id", data.topupId).maybeSingle();
    if (error || !t) throw new Error("Top-up not found");
    if (t.credited) throw new Error("Already credited");
    if (t.status !== "finished") throw new Error("Top-up not finished");
    const { error: cerr } = await supabaseAdmin.rpc("credit_wallet", {
      _user_id: t.user_id,
      _amount: Number(t.price_amount_usd),
      _reference: t.id,
      _description: `Crypto top-up (manual retry)`,
    });
    if (cerr) throw new Error(cerr.message);
    await supabaseAdmin.from("crypto_topups").update({ credited: true }).eq("id", t.id);
    await audit(context.userId, "topup.retry_credit", "crypto_topup", t.id, { amount: Number(t.price_amount_usd) });
    return { ok: true };
  });

/* ---------------- Listings ---------------- */

export const bulkUpdateListings = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: { ids: string[]; action: "active" | "sold" | "removed" | "expired" | "delete" | "restore" }) => {
    if (!Array.isArray(input.ids) || input.ids.length === 0 || input.ids.length > 200) throw new Error("Invalid ids");
    for (const id of input.ids) if (!uuid.safeParse(id).success) throw new Error("Invalid id");
    return input;
  })
  .handler(async ({ data, context }) => {
    if (data.action === "delete") {
      const { error } = await supabaseAdmin.from("listings").delete().in("id", data.ids);
      if (error) throw new Error(error.message);
    } else {
      const status = data.action === "restore" ? "active" : data.action;
      const { error } = await supabaseAdmin.from("listings").update({ status }).in("id", data.ids);
      if (error) throw new Error(error.message);
    }
    await audit(context.userId, `listing.bulk_${data.action}`, "listing", null, { count: data.ids.length, ids: data.ids });
    return { ok: true };
  });

export const editListingAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: {
    id: string; title?: string; description?: string; price?: number | null;
    status?: "active" | "sold" | "removed" | "expired"; category_id?: string; city_id?: string;
  }) => {
    if (!uuid.safeParse(input.id).success) throw new Error("Invalid id");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const patch: Record<string, unknown> = {};
    if (rest.title !== undefined) patch.title = String(rest.title).slice(0, 200);
    if (rest.description !== undefined) patch.description = String(rest.description).slice(0, 5000);
    if (rest.price !== undefined) patch.price = rest.price;
    if (rest.status !== undefined) patch.status = rest.status;
    if (rest.category_id !== undefined) patch.category_id = rest.category_id;
    if (rest.city_id !== undefined) patch.city_id = rest.city_id;
    const { error } = await supabaseAdmin.from("listings").update(patch as never).eq("id", id);
    if (error) throw new Error(error.message);
    await audit(context.userId, "listing.edit", "listing", id, patch);
    return { ok: true };
  });

export const grantPromotion = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: { listingId: string; type: "featured" | "bump"; days?: number }) => {
    if (!uuid.safeParse(input.listingId).success) throw new Error("Invalid listingId");
    if (input.type !== "featured" && input.type !== "bump") throw new Error("Invalid type");
    return input;
  })
  .handler(async ({ data, context }) => {
    if (data.type === "bump") {
      const { error } = await supabaseAdmin.from("listings").update({ bumped_at: new Date().toISOString() }).eq("id", data.listingId);
      if (error) throw new Error(error.message);
    } else {
      const days = data.days ?? 7;
      const now = new Date();
      const ends = new Date(now.getTime() + days * 86400000);
      const { error } = await supabaseAdmin.from("listing_promotions").insert({
        listing_id: data.listingId,
        type: "featured",
        starts_at: now.toISOString(),
        ends_at: ends.toISOString(),
      });
      if (error) throw new Error(error.message);
    }
    await audit(context.userId, `listing.grant_${data.type}`, "listing", data.listingId, { days: data.days });
    return { ok: true };
  });

/* ---------------- Site settings ---------------- */

export const getSiteSettings = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data, error } = await supabaseAdmin.from("site_settings").select("*").eq("id", "global").maybeSingle();
    if (error) throw new Error(error.message);
    return { settings: data };
  });

const siteSettingsSchema = z.object({
  featured_price_usd: z.number().min(0).max(9999).optional(),
  bump_price_usd: z.number().min(0).max(9999).optional(),
  featured_days: z.number().int().min(1).max(365).optional(),
  bump_days: z.number().int().min(1).max(365).optional(),
  maintenance_mode: z.boolean().optional(),
  maintenance_message: z.string().max(500).optional(),
  site_name: z.string().min(1).max(80).optional(),
  support_email: z.string().email().max(120).optional().or(z.literal("")),
});

export const updateSiteSettings = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: unknown) => siteSettingsSchema.parse(input))
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {};
    for (const k of ["featured_price_usd", "bump_price_usd", "featured_days", "bump_days", "maintenance_mode", "maintenance_message", "site_name", "support_email"] as const) {
      if (data[k] !== undefined) patch[k] = data[k];
    }
    if (Object.keys(patch).length === 0) return { ok: true };
    patch.updated_at = new Date().toISOString();
    const { error } = await supabaseAdmin.from("site_settings").update(patch as never).eq("id", "global");
    if (error) throw new Error(error.message);
    await audit(context.userId, "settings.update", "site_settings", "global", patch);
    return { ok: true };
  });

/* ---------------- Audit ---------------- */

const AUDIT_CATEGORIES = {
  wallet: ["wallet."],
  roles: ["role."],
  bans: ["user.ban", "user.unban"],
  listings: ["listing."],
  settings: ["settings."],
  topups: ["topup."],
  users: ["user.delete", "user.password_reset"],
} as const;

export const getAuditLog = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: { q?: string; category?: keyof typeof AUDIT_CATEGORIES | "all"; from?: string; to?: string; page?: number; perPage?: number }) => ({
    q: (input.q ?? "").slice(0, 100).trim(),
    category: input.category ?? "all",
    from: input.from ?? "",
    to: input.to ?? "",
    page: Math.max(1, Math.floor(input.page ?? 1)),
    perPage: Math.min(100, Math.max(10, Math.floor(input.perPage ?? 50))),
  }))
  .handler(async ({ data }) => {
    let query = supabaseAdmin
      .from("audit_log")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (data.category !== "all") {
      const prefixes = AUDIT_CATEGORIES[data.category];
      const ors = prefixes.map((p) => (p.endsWith(".") ? `action.ilike.${p}%` : `action.eq.${p}`)).join(",");
      query = query.or(ors);
    }
    if (data.q) {
      query = query.or(`action.ilike.%${data.q}%,target_id.ilike.%${data.q}%`);
    }
    if (data.from) query = query.gte("created_at", data.from);
    if (data.to) query = query.lte("created_at", data.to);

    const from = (data.page - 1) * data.perPage;
    const to = from + data.perPage - 1;
    const { data: rows, error, count } = await query.range(from, to);
    if (error) throw new Error(error.message);

    const actorIds = [...new Set((rows ?? []).map((r) => r.actor_id).filter(Boolean) as string[])];
    const targetUserIds = [...new Set((rows ?? []).filter((r) => r.target_type === "user").map((r) => r.target_id).filter(Boolean) as string[])];
    const targetListingIds = [...new Set((rows ?? []).filter((r) => r.target_type === "listing").map((r) => r.target_id).filter(Boolean) as string[])];
    const allProfileIds = [...new Set([...actorIds, ...targetUserIds])];

    const [profilesRes, listingsRes] = await Promise.all([
      allProfileIds.length ? supabaseAdmin.from("profiles").select("id, display_name").in("id", allProfileIds) : Promise.resolve({ data: [] }),
      targetListingIds.length ? supabaseAdmin.from("listings").select("id, title").in("id", targetListingIds) : Promise.resolve({ data: [] }),
    ]);
    const profiles = (profilesRes.data ?? []) as { id: string; display_name: string }[];
    const listings = (listingsRes.data ?? []) as { id: string; title: string }[];

    return {
      entries: (rows ?? []).map((r) => ({
        ...r,
        actor_name: profiles.find((p) => p.id === r.actor_id)?.display_name ?? null,
        target_name:
          r.target_type === "user" ? profiles.find((p) => p.id === r.target_id)?.display_name ?? null :
          r.target_type === "listing" ? listings.find((l) => l.id === r.target_id)?.title ?? null :
          null,
      })),
      total: count ?? 0,
      page: data.page,
      perPage: data.perPage,
      hasMore: from + (rows?.length ?? 0) < (count ?? 0),
    };
  });

/* ---------------- Dashboard ---------------- */

export const getRecentActivity = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const [{ data: users }, { data: listings }, { data: payments }, { data: topups }, { data: reports }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, display_name, created_at").order("created_at", { ascending: false }).limit(10),
      supabaseAdmin.from("listings").select("id, title, created_at, user_id").order("created_at", { ascending: false }).limit(10),
      supabaseAdmin.from("payments").select("id, amount, currency, promotion_type, status, created_at, user_id").order("created_at", { ascending: false }).limit(10),
      supabaseAdmin.from("crypto_topups").select("id, price_amount_usd, status, created_at, user_id").order("created_at", { ascending: false }).limit(10),
      supabaseAdmin.from("reports").select("id, reason, status, created_at, listing_id").order("created_at", { ascending: false }).limit(10),
    ]);
    type Item = { kind: string; at: string; payload: Record<string, string | number | null> };
    const items: Item[] = [];
    (users ?? []).forEach((u) => items.push({ kind: "signup", at: u.created_at, payload: { id: u.id, display_name: u.display_name } }));
    (listings ?? []).forEach((l) => items.push({ kind: "listing", at: l.created_at, payload: { id: l.id, title: l.title, user_id: l.user_id } }));
    (payments ?? []).forEach((p) => items.push({ kind: "payment", at: p.created_at, payload: { id: p.id, amount: Number(p.amount), currency: p.currency, type: p.promotion_type, status: p.status, user_id: p.user_id } }));
    (topups ?? []).forEach((t) => items.push({ kind: "topup", at: t.created_at, payload: { id: t.id, amount: Number(t.price_amount_usd), status: t.status, user_id: t.user_id } }));
    (reports ?? []).forEach((r) => items.push({ kind: "report", at: r.created_at, payload: { id: r.id, reason: r.reason, status: r.status, listing_id: r.listing_id } }));
    items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    return { items: items.slice(0, 25) };
  });

export const getQuickStats = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const [walletsAgg, pendingTopups, lowBalance, openReports] = await Promise.all([
      supabaseAdmin.from("wallets").select("balance_usd"),
      supabaseAdmin.from("crypto_topups").select("id", { count: "exact", head: true }).in("status", ["waiting", "confirming"]),
      supabaseAdmin.from("wallets").select("user_id, balance_usd").lt("balance_usd", 1).order("balance_usd", { ascending: true }).limit(5),
      supabaseAdmin.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    ]);
    const totalWallet = (walletsAgg.data ?? []).reduce((s, w) => s + Number(w.balance_usd ?? 0), 0);
    return {
      totalWalletUsd: totalWallet,
      pendingTopups: (pendingTopups as { count: number | null }).count ?? 0,
      lowBalanceUsers: lowBalance.data ?? [],
      openReports: (openReports as { count: number | null }).count ?? 0,
    };
  });

/* ---------------- Insights (date-range analytics) ---------------- */

export const getAdminInsights = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: { days?: number }) => ({
    days: [7, 30, 90].includes(Math.floor(input.days ?? 30)) ? Math.floor(input.days ?? 30) : 30,
  }))
  .handler(async ({ data }) => {
    const now = Date.now();
    const sinceMs = now - data.days * 86400000;
    const priorSinceMs = sinceMs - data.days * 86400000;
    const sinceIso = new Date(sinceMs).toISOString();
    const priorSinceIso = new Date(priorSinceMs).toISOString();

    const [usersRes, listingsRes, paymentsRes, eventsRes] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, created_at").gte("created_at", priorSinceIso),
      supabaseAdmin.from("listings").select("id, created_at, status").gte("created_at", priorSinceIso),
      supabaseAdmin.from("payments").select("amount, currency, status, promotion_type, created_at").gte("created_at", priorSinceIso),
      supabaseAdmin.from("listing_events").select("type, created_at").gte("created_at", sinceIso),
    ]);

    const users = usersRes.data ?? [];
    const listings = listingsRes.data ?? [];
    const payments = paymentsRes.data ?? [];
    const events = eventsRes.data ?? [];

    const inRange = <T extends { created_at: string }>(rows: T[], from: number, to: number) =>
      rows.filter((r) => {
        const t = new Date(r.created_at).getTime();
        return t >= from && t < to;
      });

    const current = {
      signups: inRange(users, sinceMs, now).length,
      listings: inRange(listings, sinceMs, now).length,
      gmv: inRange(payments, sinceMs, now).filter((p) => p.status === "completed").reduce((s, p) => s + Number(p.amount ?? 0), 0),
    };
    const prior = {
      signups: inRange(users, priorSinceMs, sinceMs).length,
      listings: inRange(listings, priorSinceMs, sinceMs).length,
      gmv: inRange(payments, priorSinceMs, sinceMs).filter((p) => p.status === "completed").reduce((s, p) => s + Number(p.amount ?? 0), 0),
    };

    const daily: { date: string; signups: number; listings: number; revenue: number }[] = [];
    for (let i = data.days - 1; i >= 0; i--) {
      const d = new Date(now - i * 86400000);
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString().slice(0, 10);
      daily.push({
        date: key,
        signups: users.filter((u) => u.created_at.slice(0, 10) === key).length,
        listings: listings.filter((l) => l.created_at.slice(0, 10) === key).length,
        revenue: payments
          .filter((p) => p.status === "completed" && p.created_at.slice(0, 10) === key)
          .reduce((s, p) => s + Number(p.amount ?? 0), 0),
      });
    }

    const eventCounts: Record<string, number> = {};
    events.forEach((e) => { eventCounts[e.type] = (eventCounts[e.type] ?? 0) + 1; });
    const funnel = [
      { stage: "Views", count: eventCounts.view ?? 0 },
      { stage: "Favorites", count: eventCounts.favorite ?? 0 },
      { stage: "Messages", count: eventCounts.message ?? 0 },
      { stage: "Contact reveals", count: eventCounts.contact_reveal ?? 0 },
    ];

    const revByType: Record<string, number> = {};
    inRange(payments, sinceMs, now)
      .filter((p) => p.status === "completed")
      .forEach((p) => {
        const k = p.promotion_type ?? "other";
        revByType[k] = (revByType[k] ?? 0) + Number(p.amount ?? 0);
      });
    const revenueByPromotion = Object.entries(revByType).map(([name, value]) => ({ name, value }));

    return { days: data.days, current, prior, daily, funnel, revenueByPromotion };
  });

/* ============================================================
 * Banners (site_banners) — admin CRUD
 * ============================================================ */

export const listBanners = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from("site_banners")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { banners: data ?? [] };
  });

const bannerSchema = z.object({
  id: uuid.optional(),
  message: z.string().min(1).max(500),
  variant: z.enum(["info", "success", "warning", "danger"]).default("info"),
  cta_label: z.string().max(60).nullable().optional(),
  cta_url: z.string().max(500).nullable().optional(),
  starts_at: z.string().optional(),
  ends_at: z.string().nullable().optional(),
  active: z.boolean().default(true),
});

export const upsertBanner = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: z.input<typeof bannerSchema>) => bannerSchema.parse(input))
  .handler(async ({ data, context }) => {
    const payload = {
      message: data.message,
      variant: data.variant,
      cta_label: data.cta_label || null,
      cta_url: data.cta_url || null,
      starts_at: data.starts_at || new Date().toISOString(),
      ends_at: data.ends_at || null,
      active: data.active,
    };
    if (data.id) {
      const { error } = await supabaseAdmin.from("site_banners").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      await audit(context.userId, "banner.update", "site_banner", data.id, {});
      return { id: data.id };
    }
    const { data: row, error } = await supabaseAdmin.from("site_banners").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    await audit(context.userId, "banner.create", "site_banner", row.id, {});
    return { id: row.id };
  });

export const deleteBanner = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: { id: string }) => z.object({ id: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await supabaseAdmin.from("site_banners").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await audit(context.userId, "banner.delete", "site_banner", data.id, {});
    return { ok: true };
  });

/* ============================================================
 * Broadcasts (notifications)
 * ============================================================ */

const broadcastSchema = z.object({
  audience: z.union([
    z.literal("all"),
    z.literal("role:user"),
    z.literal("role:moderator"),
    z.literal("role:admin"),
    z.string().regex(/^user:[0-9a-f-]{36}$/),
  ]),
  title: z.string().min(1).max(120),
  body: z.string().max(1000).nullable().optional(),
  link: z.string().max(500).nullable().optional(),
});

export const adminBroadcastNotification = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: z.input<typeof broadcastSchema>) => broadcastSchema.parse(input))
  .handler(async ({ data, context }) => {
    let recipients: string[] = [];
    if (data.audience === "all") {
      const { data: rows, error } = await supabaseAdmin.from("profiles").select("id");
      if (error) throw new Error(error.message);
      recipients = (rows ?? []).map((r) => r.id);
    } else if (data.audience.startsWith("role:")) {
      const role = data.audience.split(":")[1];
      const { data: rows, error } = await supabaseAdmin.from("user_roles").select("user_id").eq("role", role as "admin" | "moderator" | "user");
      if (error) throw new Error(error.message);
      recipients = (rows ?? []).map((r) => r.user_id);
    } else {
      recipients = [data.audience.split(":")[1]];
    }

    if (recipients.length === 0) {
      throw new Error("No recipients found for this audience.");
    }

    const payload = recipients.map((uid) => ({
      user_id: uid,
      type: "broadcast",
      title: data.title,
      body: data.body || null,
      link: data.link || null,
      metadata: { audience: data.audience, sent_by: context.userId },
    }));

    // Insert in batches of 500 to keep payload size sane.
    const BATCH = 500;
    for (let i = 0; i < payload.length; i += BATCH) {
      const { error } = await supabaseAdmin.from("notifications").insert(payload.slice(i, i + BATCH));
      if (error) throw new Error(error.message);
    }

    const { error: bcastErr } = await supabaseAdmin.from("admin_broadcasts").insert({
      actor_id: context.userId,
      audience: data.audience,
      title: data.title,
      body: data.body || null,
      link: data.link || null,
      recipient_count: recipients.length,
    });
    if (bcastErr) throw new Error(bcastErr.message);

    await audit(context.userId, "broadcast.send", "notification", data.audience, { recipients: recipients.length });
    return { sent: recipients.length };
  });

export const listBroadcasts = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from("admin_broadcasts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return { broadcasts: data ?? [] };
  });

/* ============================================================
 * Reviews moderation
 * ============================================================ */

export const listReviewsAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: { minRating?: number; maxRating?: number; limit?: number }) =>
    z.object({
      minRating: z.number().min(1).max(5).optional(),
      maxRating: z.number().min(1).max(5).optional(),
      limit: z.number().min(1).max(200).default(100),
    }).parse(input))
  .handler(async ({ data }) => {
    let q = supabaseAdmin
      .from("seller_reviews")
      .select("id, rating, body, created_at, reviewer_id, seller_id, listing_id")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.minRating) q = q.gte("rating", data.minRating);
    if (data.maxRating) q = q.lte("rating", data.maxRating);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const ids = Array.from(new Set([
      ...rows!.map((r) => r.reviewer_id),
      ...rows!.map((r) => r.seller_id),
    ]));
    const { data: profiles } = ids.length
      ? await supabaseAdmin.from("profiles").select("id, display_name").in("id", ids)
      : { data: [] };
    const name = (id: string) => profiles?.find((p) => p.id === id)?.display_name ?? id.slice(0, 8);
    return {
      reviews: (rows ?? []).map((r) => ({
        ...r,
        reviewer_name: name(r.reviewer_id),
        seller_name: name(r.seller_id),
      })),
    };
  });

export const deleteReviewAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: { id: string; reason?: string }) =>
    z.object({ id: uuid, reason: z.string().max(500).optional() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await supabaseAdmin.from("seller_reviews").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await audit(context.userId, "review.delete", "seller_review", data.id, { reason: data.reason });
    return { ok: true };
  });

/* ============================================================
 * Threads / Messages moderation
 * ============================================================ */

export const listThreadsAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: { limit?: number }) =>
    z.object({ limit: z.number().min(1).max(200).default(100) }).parse(input))
  .handler(async ({ data }) => {
    const { data: threads, error } = await supabaseAdmin
      .from("message_threads")
      .select("id, buyer_id, seller_id, listing_id, created_at, last_message_at")
      .order("last_message_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    const ids = (threads ?? []).map((t) => t.id);
    const userIds = Array.from(new Set([
      ...(threads ?? []).map((t) => t.buyer_id),
      ...(threads ?? []).map((t) => t.seller_id),
    ]));
    const listingIds = Array.from(new Set((threads ?? []).map((t) => t.listing_id)));
    const [{ data: lastMessages }, { data: profiles }, { data: listings }, { data: counts }] = await Promise.all([
      ids.length
        ? supabaseAdmin.from("messages").select("thread_id, body, created_at, sender_id").in("thread_id", ids).order("created_at", { ascending: false })
        : Promise.resolve({ data: [] as { thread_id: string; body: string; created_at: string; sender_id: string }[] }),
      userIds.length
        ? supabaseAdmin.from("profiles").select("id, display_name").in("id", userIds)
        : Promise.resolve({ data: [] as { id: string; display_name: string }[] }),
      listingIds.length
        ? supabaseAdmin.from("listings").select("id, title").in("id", listingIds)
        : Promise.resolve({ data: [] as { id: string; title: string }[] }),
      ids.length
        ? supabaseAdmin.from("messages").select("thread_id").in("thread_id", ids)
        : Promise.resolve({ data: [] as { thread_id: string }[] }),
    ]);
    const lastMap = new Map<string, { body: string; created_at: string }>();
    for (const m of lastMessages ?? []) {
      if (!lastMap.has(m.thread_id)) lastMap.set(m.thread_id, { body: m.body, created_at: m.created_at });
    }
    const countMap = new Map<string, number>();
    for (const c of counts ?? []) countMap.set(c.thread_id, (countMap.get(c.thread_id) ?? 0) + 1);
    const name = (id: string) => profiles?.find((p) => p.id === id)?.display_name ?? id.slice(0, 8);
    const title = (id: string) => listings?.find((l) => l.id === id)?.title ?? "—";
    return {
      threads: (threads ?? []).map((t) => ({
        ...t,
        buyer_name: name(t.buyer_id),
        seller_name: name(t.seller_id),
        listing_title: title(t.listing_id),
        last_message: lastMap.get(t.id)?.body ?? null,
        message_count: countMap.get(t.id) ?? 0,
      })),
    };
  });

export const deleteThreadAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: { id: string }) => z.object({ id: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const { error: mErr } = await supabaseAdmin.from("messages").delete().eq("thread_id", data.id);
    if (mErr) throw new Error(mErr.message);
    const { error } = await supabaseAdmin.from("message_threads").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await audit(context.userId, "thread.delete", "message_thread", data.id, {});
    return { ok: true };
  });

/* ============================================================
 * Debug & Error Center
 * ============================================================ */

export const listClientErrors = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: { onlyUnresolved?: boolean; limit?: number }) =>
    z.object({
      onlyUnresolved: z.boolean().default(false),
      limit: z.number().min(1).max(500).default(200),
    }).parse(input))
  .handler(async ({ data }) => {
    let q = supabaseAdmin
      .from("client_error_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.onlyUnresolved) q = q.eq("resolved", false);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { errors: rows ?? [] };
  });

export const resolveClientError = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: { id: string; resolved: boolean }) =>
    z.object({ id: uuid, resolved: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await supabaseAdmin
      .from("client_error_logs")
      .update({ resolved: data.resolved })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await audit(context.userId, data.resolved ? "error.resolve" : "error.reopen", "client_error", data.id, {});
    return { ok: true };
  });

export const deleteResolvedClientErrors = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .handler(async ({ context }) => {
    const { error, count } = await supabaseAdmin
      .from("client_error_logs")
      .delete({ count: "exact" })
      .eq("resolved", true);
    if (error) throw new Error(error.message);
    await audit(context.userId, "error.cleanup", "client_error", null, { deleted: count ?? 0 });
    return { deleted: count ?? 0 };
  });

export const listServerFnLogs = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: { onlyErrors?: boolean; limit?: number }) =>
    z.object({
      onlyErrors: z.boolean().default(false),
      limit: z.number().min(1).max(500).default(200),
    }).parse(input))
  .handler(async ({ data }) => {
    let q = supabaseAdmin
      .from("server_fn_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.onlyErrors) q = q.neq("status", "ok");
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { logs: rows ?? [] };
  });

export const getSystemHealth = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const dayAgo = new Date(Date.now() - 86400000).toISOString();
    const [
      usersCount, listingsCount, activeListings, pendingTopups, failedPayments24h,
      openReports, unresolvedErrors, serverErrors24h, walletSum, settingsRes,
    ] = await Promise.all([
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("listings").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("listings").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabaseAdmin.from("crypto_topups").select("id", { count: "exact", head: true }).in("status", ["waiting", "confirming"]),
      supabaseAdmin.from("payments").select("id", { count: "exact", head: true }).eq("status", "failed").gte("created_at", dayAgo),
      supabaseAdmin.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
      supabaseAdmin.from("client_error_logs").select("id", { count: "exact", head: true }).eq("resolved", false),
      supabaseAdmin.from("server_fn_logs").select("id", { count: "exact", head: true }).neq("status", "ok").gte("created_at", dayAgo),
      supabaseAdmin.from("wallets").select("balance_usd"),
      supabaseAdmin.from("site_settings").select("*").eq("id", "global").maybeSingle(),
    ]);
    const totalWallet = (walletSum.data ?? []).reduce((s, w) => s + Number(w.balance_usd ?? 0), 0);
    return {
      generatedAt: new Date().toISOString(),
      counts: {
        users: usersCount.count ?? 0,
        listings: listingsCount.count ?? 0,
        activeListings: activeListings.count ?? 0,
        pendingTopups: pendingTopups.count ?? 0,
        failedPayments24h: failedPayments24h.count ?? 0,
        openReports: openReports.count ?? 0,
        unresolvedErrors: unresolvedErrors.count ?? 0,
        serverErrors24h: serverErrors24h.count ?? 0,
      },
      walletsTotalUsd: totalWallet,
      maintenanceMode: !!settingsRes.data?.maintenance_mode,
    };
  });

/* DB inspector — strict allow-list */
const SAFE_TABLES = {
  listings: "id, title, status, price, created_at, user_id",
  profiles: "id, display_name, created_at",
  categories: "id, name, slug, sort_order",
  cities: "id, name, slug, country",
  payments: "id, amount, status, provider, created_at, user_id",
  crypto_topups: "id, status, price_amount_usd, pay_currency, created_at, user_id",
  reports: "id, reason, status, created_at, reporter_id, listing_id",
  audit_log: "id, action, target_type, target_id, actor_id, created_at",
  site_banners: "id, message, variant, active, starts_at, ends_at",
  homepage_slots: "id, position, title, active, sort_order",
  notifications: "id, type, title, created_at, user_id, read_at",
} as const;
type SafeTable = keyof typeof SAFE_TABLES;

export const adminPeekTable = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: { table: string; limit?: number }) =>
    z.object({
      table: z.enum(Object.keys(SAFE_TABLES) as [SafeTable, ...SafeTable[]]),
      limit: z.number().min(1).max(100).default(50),
    }).parse(input))
  .handler(async ({ data }) => {
    const cols = SAFE_TABLES[data.table as SafeTable];
    type Cell = string | number | boolean | null;
    type Row = Record<string, Cell>;
    const client = supabaseAdmin as unknown as {
      from: (t: string) => {
        select: (s: string) => {
          order: (c: string, o: { ascending: boolean }) => {
            limit: (n: number) => Promise<{ data: Row[] | null; error: { message: string } | null }>;
          };
        };
      };
    };
    const { data: rows, error } = await client
      .from(data.table)
      .select(cols)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    // Stringify any non-primitive values to keep payload serializable.
    const normalized: Row[] = (rows ?? []).map((r) => {
      const out: Row = {};
      for (const k of Object.keys(r)) {
        const v = r[k];
        out[k] = (v === null || typeof v === "string" || typeof v === "number" || typeof v === "boolean") ? v : JSON.stringify(v);
      }
      return out;
    });
    return { table: data.table, columns: cols.split(",").map((c) => c.trim()), rows: normalized };
  });

export const safeTablesList = Object.keys(SAFE_TABLES);
