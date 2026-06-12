import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalLayout } from "@/components/LegalLayout";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: "Cookies Policy — CallEscort24" },
      { name: "description", content: "How CallEscort24 uses cookies and local storage on an adult classified directory, and how you can manage your preferences." },
      { property: "og:title", content: "Cookies Policy — CallEscort24" },
      { property: "og:description", content: "Cookies and storage used on CallEscort24." },
      { property: "og:url", content: "https://callescort24.org/cookies" },
    ],
    links: [{ rel: "canonical", href: "https://callescort24.org/cookies" }],
  }),
  component: CookiesPage,
});

function CookiesPage() {
  return (
    <LegalLayout title="Cookies Policy" updated="June 12, 2026">
      <p>
        This Cookies Policy explains how <strong>CallEscort24</strong> uses cookies and similar
        browser-storage technologies (such as <code>localStorage</code> and <code>sessionStorage</code>)
        on our adult classified directory. For more on how we handle personal data, see our{" "}
        <Link to="/privacy">Privacy Policy</Link>.
      </p>

      <h2>1. What are cookies?</h2>
      <p>
        Cookies are small text files stored on your device by your browser. They let the site
        remember information about your visit — such as whether you have confirmed you are 18+, your
        sign-in state, and your preferred city — and help us keep the site secure and reliable.
      </p>

      <h2>2. Categories of storage we use</h2>

      <h3>Strictly necessary</h3>
      <p>
        Required for the site to work. You cannot turn these off without breaking core features.
      </p>
      <ul>
        <li><code>sb-*</code> — authentication and session tokens.</li>
        <li><code>ce24.age-verified</code> — confirms you have passed the 18+ age gate (local storage, 30 days).</li>
        <li><code>callescort24.cookie-consent</code> — your consent choice for the cookie banner.</li>
        <li>CSRF and load-balancing cookies set by our hosting provider.</li>
      </ul>

      <h3>Functional</h3>
      <p>Remember your preferences to give a more personal experience.</p>
      <ul>
        <li><code>callescort24.city</code> — the city you are browsing.</li>
        <li><code>callescort24.theme</code> — light or dark mode preference.</li>
        <li>Recently viewed listings, favorites, and message read state.</li>
      </ul>

      <h3>Analytics (consent-based)</h3>
      <p>
        Only used if you accept analytics in the cookie banner. We record aggregate listing
        engagement (views, favorites, contact reveals) and basic page traffic so we can improve
        the directory. We do <strong>not</strong> use third-party advertising or cross-site
        tracking, and we do not sell any data.
      </p>

      <h2>3. How to control cookies</h2>
      <p>
        You can accept or decline non-essential cookies via the banner on your first visit and
        change your choice at any time by clearing browser storage for this site. Most browsers
        also let you block or delete cookies — see your browser's help pages. Disabling strictly
        necessary cookies will prevent you from signing in or posting a listing.
      </p>

      <h2>4. Third-party processors</h2>
      <p>
        Some cookies are set by the providers we use to operate the directory — our hosting and CDN
        provider, payment processors, ID-verification vendors, and email senders. These providers
        have their own privacy and cookie policies and are bound by data-protection agreements with
        us.
      </p>

      <h2>5. Changes</h2>
      <p>
        We may update this Cookies Policy from time to time. The "Last updated" date above always
        reflects the current version.
      </p>

      <h2>6. Contact</h2>
      <p>
        Questions about cookies? Reach us through our <Link to="/contact">contact page</Link>.
      </p>
    </LegalLayout>
  );
}
