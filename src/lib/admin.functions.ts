import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdmin } from "./admin-middleware";
import { runSeedDemo } from "./seed-demo.server";

const uuid = z.string().uuid();

async function audit(actor: string, action: string, target_type: string | null, target_id: string | null, metadata: Record<string, unknown> = {}) {
  await supabaseAdmin.rpc("log_admin_action", {
    _actor: actor,
    _action: action,
    _target_type: target_type,
    _target_id: target_id,
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
  .handler(async () => {
    return await runSeedDemo();
  });

/* ---------------- Users ---------------- */

export const listUsersAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: { q?: string; filter?: "all" | "admins" | "moderators" | "banned" }) => ({
    q: (input.q ?? "").slice(0, 100),
    filter: input.filter ?? "all",
  }))
  .handler(async ({ data }) => {
    // Pull auth users (page 1, perPage=200). Good enough for now.
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (authErr) throw new Error(authErr.message);
    const authUsers = authData.users;
    const ids = authUsers.map((u) => u.id);
    if (!ids.length) return { users: [] };

    const [{ data: profiles }, { data: roles }, { data: wallets }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, display_name, created_at, city_id").in("id", ids),
      supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", ids),
      supabaseAdmin.from("wallets").select("user_id, balance_usd").in("user_id", ids),
    ]);

    let out = authUsers.map((u) => {
      const profile = profiles?.find((p) => p.id === u.id);
      const userRoles = (roles ?? []).filter((r) => r.user_id === u.id).map((r) => r.role as string);
      const banned = !!u.banned_until && new Date(u.banned_until).getTime() > Date.now();
      const balance = Number(wallets?.find((w) => w.user_id === u.id)?.balance_usd ?? 0);
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
    return { users: out };
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

export const getUserDetails = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: { userId: string }) => {
    if (!uuid.safeParse(input.userId).success) throw new Error("Invalid userId");
    return input;
  })
  .handler(async ({ data }) => {
    const [{ data: listings }, { data: payments }, { data: txs }, { data: threads }] = await Promise.all([
      supabaseAdmin.from("listings").select("id, title, status, price, currency, created_at, view_count").eq("user_id", data.userId).order("created_at", { ascending: false }).limit(50),
      supabaseAdmin.from("payments").select("*").eq("user_id", data.userId).order("created_at", { ascending: false }).limit(50),
      supabaseAdmin.from("wallet_transactions").select("*").eq("user_id", data.userId).order("created_at", { ascending: false }).limit(50),
      supabaseAdmin.from("message_threads").select("id", { count: "exact", head: true }).or(`buyer_id.eq.${data.userId},seller_id.eq.${data.userId}`),
    ]);
    return {
      listings: listings ?? [],
      payments: payments ?? [],
      walletTxs: txs ?? [],
      threadsCount: (threads as { count: number | null }).count ?? 0,
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
    const { error } = await supabaseAdmin.from("listings").update(patch).eq("id", id);
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

export const updateSiteSettings = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: {
    featured_price_usd?: number; bump_price_usd?: number;
    featured_days?: number; bump_days?: number;
    maintenance_mode?: boolean; maintenance_message?: string;
    site_name?: string; support_email?: string;
  }) => input)
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {};
    for (const k of ["featured_price_usd", "bump_price_usd", "featured_days", "bump_days", "maintenance_mode", "maintenance_message", "site_name", "support_email"] as const) {
      if (data[k] !== undefined) patch[k] = data[k];
    }
    const { error } = await supabaseAdmin.from("site_settings").update(patch).eq("id", "global");
    if (error) throw new Error(error.message);
    await audit(context.userId, "settings.update", "site_settings", "global", patch);
    return { ok: true };
  });

/* ---------------- Audit ---------------- */

export const getAuditLog = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from("audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    const actorIds = [...new Set((data ?? []).map((r) => r.actor_id).filter(Boolean) as string[])];
    const { data: profiles } = actorIds.length
      ? await supabaseAdmin.from("profiles").select("id, display_name").in("id", actorIds)
      : { data: [] as { id: string; display_name: string }[] };
    return {
      entries: (data ?? []).map((r) => ({
        ...r,
        actor_name: profiles?.find((p) => p.id === r.actor_id)?.display_name ?? null,
      })),
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
    type Item = { kind: string; at: string; payload: unknown };
    const items: Item[] = [];
    (users ?? []).forEach((u) => items.push({ kind: "signup", at: u.created_at, payload: u }));
    (listings ?? []).forEach((l) => items.push({ kind: "listing", at: l.created_at, payload: l }));
    (payments ?? []).forEach((p) => items.push({ kind: "payment", at: p.created_at, payload: p }));
    (topups ?? []).forEach((t) => items.push({ kind: "topup", at: t.created_at, payload: t }));
    (reports ?? []).forEach((r) => items.push({ kind: "report", at: r.created_at, payload: r }));
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
