import { Link } from "@tanstack/react-router";
import { Github, Mail } from "lucide-react";
import logoUrl from "@/assets/logo.png";

const sections: Array<{
  heading: string;
  links: Array<{ label: string; to?: string; href?: string }>;
}> = [
  {
    heading: "Marketplace",
    links: [
      { label: "Browse", to: "/search" },
      { label: "Post a listing", to: "/post" },
      { label: "My favorites", to: "/favorites" },
      { label: "Saved searches", to: "/saved-searches" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", to: "/about" },
      { label: "Contact", to: "/contact" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy Policy", to: "/privacy" },
      { label: "Terms of Service", to: "/terms" },
      { label: "Cookies Policy", to: "/cookies" },
      { label: "DMCA", to: "/dmca" },
      { label: "Sitemap", href: "/sitemap.xml" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-16 border-t border-white/40 bg-white/40 backdrop-blur-md text-sm dark:border-white/10 dark:bg-white/5">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-12 md:gap-10">
          <div className="col-span-2 md:col-span-4">
            <Link to="/" className="inline-flex items-center gap-2 font-display text-xl font-bold">
              <img src={logoUrl} alt="CallEscort24" width={32} height={32} loading="lazy" className="h-8 w-8 rounded-lg object-contain" />
              <span className="gradient-text">CallEscort24</span>
            </Link>
            <p className="mt-3 max-w-xs text-muted-foreground">
              A modern marketplace for buying and selling across the US, UK and Canada.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <a
                href="mailto:support@callescort24.com"
                aria-label="Email"
                className="grid h-9 w-9 place-items-center rounded-full border border-white/50 bg-white/70 text-muted-foreground transition hover:text-foreground"
              >
                <Mail className="h-4 w-4" />
              </a>
              <a
                href="https://github.com"
                aria-label="GitHub"
                target="_blank"
                rel="noreferrer"
                className="grid h-9 w-9 place-items-center rounded-full border border-white/50 bg-white/70 text-muted-foreground transition hover:text-foreground"
              >
                <Github className="h-4 w-4" />
              </a>
            </div>
          </div>

          {sections.map((s) => (
            <div key={s.heading} className="md:col-span-2">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {s.heading}
              </div>
              <ul className="space-y-2">
                {s.links.map((l) => (
                  <li key={l.label}>
                    {l.to ? (
                      <Link to={l.to} className="hover:text-primary">
                        {l.label}
                      </Link>
                    ) : (
                      <a href={l.href} className="hover:text-primary">
                        {l.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="col-span-2 md:col-span-2">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Stay in touch
            </div>
            <p className="text-xs text-muted-foreground">
              Follow new categories, featured items, and product updates.
            </p>
            <Link
              to="/signup"
              className="mt-3 inline-flex rounded-full bg-foreground px-4 py-1.5 text-xs font-semibold text-background transition hover:opacity-90"
            >
              Join free
            </Link>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center gap-3 border-t border-white/30 pt-6 text-xs text-muted-foreground md:flex-row md:justify-between dark:border-white/10">
          <div>© {new Date().getFullYear()} CallEscort24. All rights reserved.</div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link to="/terms" className="hover:text-foreground">Terms</Link>
            <Link to="/cookies" className="hover:text-foreground">Cookies</Link>
            <Link to="/dmca" className="hover:text-foreground">DMCA</Link>
            <a href="/sitemap.xml" className="hover:text-foreground">Sitemap</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
