import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const DEMO_USER = { email: "demo@callescort24.test", password: "DemoUser123!", display_name: "Demo User" };
export const ADMIN_USER = { email: "admin@callescort24.test", password: "Adm!n-CallEscort24-2026#Xq7", display_name: "Admin User" };

const SAMPLE_LISTINGS: { title: string; description: string; condition: "good" | "like_new" | "not_applicable" | "new" | "fair" | "poor" }[] = [
  { title: "Vintage road bike — Trek 520", description: "Lovingly maintained, ready to ride.", condition: "good" },
  { title: "MacBook Pro 14\" M2 — 2023", description: "Like new, includes original charger and box.", condition: "like_new" },
  { title: "Cozy 1-bed apartment downtown", description: "Available June 1. Utilities included.", condition: "not_applicable" },
  { title: "IKEA sectional sofa — grey", description: "Comfortable and clean. Pickup only.", condition: "good" },
  { title: "Mountain skis 175cm + bindings", description: "Used two seasons. Great all-mountain pair.", condition: "good" },
];

/**
 * Ensure a user exists with the given credentials. If the user already exists,
 * reset their password and confirm their email so re-running heals the account.
 */
async function ensureUser(email: string, password: string, display_name: string) {
  const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const existing = list?.users.find(u => u.email === email);

  if (existing) {
    // Heal: reset password + confirm email + ensure metadata
    await supabaseAdmin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { ...(existing.user_metadata ?? {}), display_name },
    });
    return { id: existing.id, created: false };
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { display_name },
  });
  if (error || !data.user) throw new Error(`Create ${email} failed: ${error?.message}`);
  return { id: data.user.id, created: true };
}

async function seedListingsFor(userId: string) {
  const { data: existing } = await supabaseAdmin.from("listings").select("id").eq("user_id", userId).limit(1);
  if (existing && existing.length > 0) return 0;

  const { data: cats } = await supabaseAdmin.from("categories").select("id").limit(20);
  const { data: cities } = await supabaseAdmin.from("cities").select("id").limit(20);
  if (!cats?.length || !cities?.length) return 0;

  const rows = SAMPLE_LISTINGS.map((s, i) => ({
    user_id: userId,
    title: s.title,
    description: s.description,
    item_age: "Used",
    condition: s.condition,
    status: "active" as const,
    category_id: cats[i % cats.length].id,
    city_id: cities[i % cities.length].id,
    view_count: Math.floor(Math.random() * 240) + 10,
    slug: "",
  }));
  const { error } = await supabaseAdmin.from("listings").insert(rows);
  if (error) throw error;
  return rows.length;
}

export async function runSeedDemo() {
  const demo = await ensureUser(DEMO_USER.email, DEMO_USER.password, DEMO_USER.display_name);
  const admin = await ensureUser(ADMIN_USER.email, ADMIN_USER.password, ADMIN_USER.display_name);

  // Ensure admin role row
  const { data: existingRole } = await supabaseAdmin
    .from("user_roles").select("role").eq("user_id", admin.id).eq("role", "admin").maybeSingle();
  if (!existingRole) {
    await supabaseAdmin.from("user_roles").insert({ user_id: admin.id, role: "admin" });
  }

  const demoCount = await seedListingsFor(demo.id);
  const adminCount = await seedListingsFor(admin.id);

  return {
    ok: true,
    accounts: [
      { email: DEMO_USER.email, password: DEMO_USER.password, id: demo.id, listings_seeded: demoCount, was_created: demo.created },
      { email: ADMIN_USER.email, password: ADMIN_USER.password, id: admin.id, role: "admin", listings_seeded: adminCount, was_created: admin.created },
    ],
  };
}

export async function hasAnyAdmin(): Promise<boolean> {
  const { count } = await supabaseAdmin
    .from("user_roles")
    .select("user_id", { count: "exact", head: true })
    .eq("role", "admin");
  return (count ?? 0) > 0;
}
