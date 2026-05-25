import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * POST /api/public/seed-demo
 *
 * Creates two demo accounts (idempotent) and seeds sample data so dashboards
 * are populated.
 *
 *   - demo@marketly.test   / DemoUser123!   (role: user)
 *   - admin@marketly.test  / AdminUser123!  (role: admin + user)
 *
 * Protected by a shared secret: must pass header `x-seed-token` matching
 * the `SUPABASE_SERVICE_ROLE_KEY` env var so only the project owner can run it.
 */

const DEMO_USER = { email: "demo@marketly.test", password: "DemoUser123!", display_name: "Demo User" };
const ADMIN_USER = { email: "admin@marketly.test", password: "AdminUser123!", display_name: "Admin User" };

const SAMPLE_LISTINGS: { title: string; description: string; price: number; condition: "good" | "like_new" | "not_applicable" | "new" | "fair" | "poor" }[] = [
  { title: "Vintage road bike — Trek 520", description: "Lovingly maintained, ready to ride.", price: 480, condition: "good" },
  { title: "MacBook Pro 14\" M2 — 2023", description: "Like new, includes original charger and box.", price: 1450, condition: "like_new" },
  { title: "Cozy 1-bed apartment downtown", description: "Available June 1. Utilities included.", price: 1800, condition: "not_applicable" },
  { title: "IKEA sectional sofa — grey", description: "Comfortable and clean. Pickup only.", price: 220, condition: "good" },
  { title: "Mountain skis 175cm + bindings", description: "Used two seasons. Great all-mountain pair.", price: 260, condition: "good" },
];

async function ensureUser(email: string, password: string, display_name: string) {
  // Check if exists
  const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const existing = list?.users.find(u => u.email === email);
  if (existing) return { id: existing.id, created: false };

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
    price: s.price,
    currency: "USD",
    condition: s.condition,
    status: "active" as const,
    category_id: cats[i % cats.length].id,
    city_id: cities[i % cities.length].id,
    view_count: Math.floor(Math.random() * 240) + 10,
  }));
  const { error } = await supabaseAdmin.from("listings").insert(rows);
  if (error) throw error;
  return rows.length;
}

export const Route = createFileRoute("/api/public/seed-demo")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("x-seed-token");
        if (!token || token !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
          return new Response("Unauthorized", { status: 401 });
        }

        try {
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

          return Response.json({
            ok: true,
            accounts: [
              { ...DEMO_USER, id: demo.id, listings_seeded: demoCount, was_created: demo.created },
              { ...ADMIN_USER, id: admin.id, role: "admin", listings_seeded: adminCount, was_created: admin.created },
            ],
          });
        } catch (e: any) {
          console.error("seed-demo error:", e);
          return new Response(JSON.stringify({ ok: false, error: e.message }), {
            status: 500, headers: { "content-type": "application/json" },
          });
        }
      },
      GET: async () => new Response("Use POST with x-seed-token header.", { status: 405 }),
    },
  },
});
