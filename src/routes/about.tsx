import { createFileRoute, Link } from "@tanstack/react-router";
import { Globe2, ShieldCheck, Sparkles, Users } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — CallEscort24" },
      { name: "description", content: "CallEscort24 is an adult directory connecting independent providers and verified clients across the US, UK and Canada. Strictly 18+." },
      { property: "og:title", content: "About — CallEscort24" },
      { property: "og:description", content: "An adult directory built for safety, discretion and beautiful design. Strictly 18+." },
      { property: "og:url", content: "https://callescort24.org/about" },
    ],
    links: [{ rel: "canonical", href: "https://callescort24.org/about" }],
  }),
  component: AboutPage,
});

const values = [
  { icon: ShieldCheck, title: "Trust first", body: "Verified profiles, secure messaging, reviews and reports keep the community honest." },
  { icon: Sparkles, title: "Beautiful by default", body: "We obsess over typography, motion and small details so listing your stuff feels great." },
  { icon: Globe2, title: "Cross-border", body: "Built for the US, UK and Canada with local cities, currencies and search." },
  { icon: Users, title: "Community-led", body: "Sellers, buyers and moderators shape what we build next." },
];

function AboutPage() {
  return (
    <div className="container mx-auto max-w-5xl px-4 py-10">
      <header className="text-center">
        <h1 className="font-display text-4xl font-bold md:text-5xl">
          An adult directory that <span className="gradient-text">feels good to use</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          CallEscort24 connects independent adult providers with verified clients across the US, UK and Canada.
          We're rebuilding the experience from the ground up — safe, discreet and a delight to look at. Strictly 18+.
        </p>
      </header>

      <section className="mt-12 grid gap-4 sm:grid-cols-2">
        {values.map((v) => (
          <div
            key={v.title}
            className="iridescent-border rounded-3xl border border-white/40 bg-white/65 p-6 shadow-[var(--shadow-float)] backdrop-blur-xl dark:border-white/10 dark:bg-white/5"
          >
            <div
              className="mb-3 grid h-10 w-10 place-items-center rounded-xl text-white shadow-md"
              style={{ background: "var(--gradient-primary)" }}
            >
              <v.icon className="h-5 w-5" />
            </div>
            <h2 className="font-display text-lg font-bold">{v.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{v.body}</p>
          </div>
        ))}
      </section>

      <section className="mt-12 rounded-3xl border border-white/40 bg-white/65 p-8 text-center backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
        <h2 className="font-display text-2xl font-bold">Ready to list something?</h2>
        <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
          Posting takes under two minutes. No fees to list — only optional promotions when you want extra
          reach.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link
            to="/post"
            className="btn-gradient rounded-full border-0 px-6 py-2.5 text-sm font-semibold text-white shadow-md"
          >
            Post a listing
          </Link>
          <Link
            to="/search"
            className="rounded-full border border-white/50 bg-white/70 px-6 py-2.5 text-sm font-semibold hover:bg-white"
          >
            Browse marketplace
          </Link>
        </div>
      </section>
    </div>
  );
}
