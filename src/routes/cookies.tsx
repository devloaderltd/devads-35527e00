import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalLayout } from "@/components/LegalLayout";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: "Cookies Policy — CallEscort24" },
      { name: "description", content: "How CallEscort24 uses cookies and similar technologies, and how you can manage your preferences." },
      { property: "og:title", content: "Cookies Policy — CallEscort24" },
      { property: "og:description", content: "Cookies and tracking technologies used on CallEscort24." },
      { property: "og:url", content: "https://callescort24.org/cookies" },
    ],
    links: [{ rel: "canonical", href: "https://callescort24.org/cookies" }],
  }),
  component: CookiesPage,
});

function CookiesPage() {
  return (
    <LegalLayout title="Cookies Policy" updated="May 25, 2026">
      <p>
        This Cookies Policy explains how <strong>CallEscort24</strong> uses cookies and similar storage
        technologies (such as localStorage) on our website. For more information about how we handle
        personal data, see our <Link to="/privacy">Privacy Policy</Link>.
      </p>

      <h2>1. What are cookies?</h2>
      <p>
        Cookies are small text files stored on your device by your browser when you visit a website. They
        let the site remember information about your visit, such as your preferred language or sign-in
        state, and help us understand how visitors use the site.
      </p>

      <h2>2. Types of cookies we use</h2>
      <h3>Strictly necessary</h3>
      <p>
        Required for the site to function. They power authentication, session security, your shopping
        wallet, fraud prevention, and load balancing. They cannot be turned off in our systems.
      </p>
      <ul>
        <li><code>sb-*</code> — session and authentication tokens.</li>
        <li><code>callescort24.city</code> — your selected browsing city (localStorage).</li>
        <li><code>callescort24.theme</code> — light/dark mode preference (localStorage).</li>
        <li><code>callescort24.cookie-consent</code> — your consent choice for this banner (localStorage).</li>
      </ul>

      <h3>Functional</h3>
      <p>
        Remember your choices to give a more personalized experience (e.g. recently viewed listings,
        favorites, message read state).
      </p>

      <h3>Analytics</h3>
      <p>
        Help us understand how the marketplace is used so we can improve it. We record aggregate listing
        engagement events (views, favorites, contact reveals) and basic page traffic. We do not use
        third-party advertising trackers.
      </p>

      <h2>3. How to control cookies</h2>
      <p>
        You can accept or decline non-essential cookies via the cookie banner shown on your first visit.
        You can change your choice at any time by clearing your browser storage for this site. Most
        browsers also let you block or delete cookies directly — see your browser's help pages.
      </p>
      <p>
        Disabling strictly necessary cookies will prevent core features (such as signing in or posting a
        listing) from working.
      </p>

      <h2>4. Third parties</h2>
      <p>
        Some cookies are set by service providers we use to operate the marketplace (such as our hosting
        provider, payment processors, and email senders). These providers have their own privacy and
        cookie policies.
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
