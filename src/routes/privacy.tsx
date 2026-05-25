import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalLayout } from "@/components/LegalLayout";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — CallEscort24" },
      { name: "description", content: "How CallEscort24 collects, uses, stores, and protects your personal data when you use our marketplace." },
      { property: "og:title", content: "Privacy Policy — CallEscort24" },
      { property: "og:description", content: "How we handle your data on CallEscort24." },
      { property: "og:url", content: "https://devads.lovable.app/privacy" },
    ],
    links: [{ rel: "canonical", href: "https://devads.lovable.app/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" updated="May 25, 2026">
      <p>
        This Privacy Policy explains how <strong>CallEscort24</strong> ("we", "us", "our") collects, uses, and
        protects information when you visit or use our marketplace, accessible at{" "}
        <a href="https://devads.lovable.app">devads.lovable.app</a>. By using CallEscort24 you agree to this
        policy.
      </p>

      <h2>1. Information we collect</h2>
      <h3>Information you give us</h3>
      <ul>
        <li>Account details: display name, email address, password (stored hashed), optional phone number, avatar and bio.</li>
        <li>Listing content: titles, descriptions, prices, photos, category, condition and location of items you post.</li>
        <li>Messages: communications you exchange with other users through our messaging system.</li>
        <li>Reviews: ratings and written feedback you leave for sellers.</li>
        <li>Payment data: wallet top-ups and promotion purchases. Card or crypto details are processed by our payment providers — we never see your full card number.</li>
      </ul>
      <h3>Information we collect automatically</h3>
      <ul>
        <li>Engagement events on listings (views, favorites, contact reveals, messages opened) used to power analytics and recommendations.</li>
        <li>Device and connection metadata (IP address, browser, language, approximate location, referring URL).</li>
        <li>Cookies and similar technologies — see our <Link to="/cookies">Cookies Policy</Link>.</li>
      </ul>

      <h2>2. How we use your information</h2>
      <ul>
        <li>To operate, secure and improve the marketplace.</li>
        <li>To authenticate you, prevent fraud, and enforce our <Link to="/terms">Terms of Service</Link>.</li>
        <li>To deliver listings, messaging, notifications, and saved search alerts you request.</li>
        <li>To process payments, wallet top-ups, and listing promotions.</li>
        <li>To respond to reports and moderate content.</li>
        <li>To send service announcements and, with your consent, marketing communications.</li>
      </ul>

      <h2>3. Legal bases (EU/UK users)</h2>
      <p>
        We process personal data under the legal bases of contract performance, our legitimate interests in
        operating a safe marketplace, your consent (where required, e.g. marketing emails), and to comply
        with legal obligations.
      </p>

      <h2>4. Sharing your information</h2>
      <ul>
        <li><strong>Other users</strong>: your display name, avatar, bio, city, listings, and reviews are publicly visible.</li>
        <li><strong>Service providers</strong>: hosting (Lovable Cloud / Supabase), payment processors, email/SMS senders, and analytics.</li>
        <li><strong>Authorities</strong>: where required by law, court order, or to protect our rights and the safety of users.</li>
        <li><strong>Business transfers</strong>: in the event of a merger, acquisition, or asset sale.</li>
      </ul>
      <p>We do not sell your personal data.</p>

      <h2>5. Data retention</h2>
      <p>
        We keep your account data while your account is active. Listings and messages are retained as long
        as needed for service operation and dispute resolution. You can delete your listings at any time;
        to request full account deletion contact us at the address below.
      </p>

      <h2>6. Your rights</h2>
      <p>
        Depending on where you live, you may have the right to access, correct, delete, restrict, or
        port your personal data, and to object to certain processing. To exercise these rights, contact us
        at <a href="mailto:support@callescort24.com">support@callescort24.com</a>.
      </p>

      <h2>7. Security</h2>
      <p>
        We use industry-standard safeguards including encryption in transit, secure password hashing, role
        based access controls, and row-level security on our database. No system is 100% secure — please use
        a strong unique password and notify us of any suspected unauthorized access.
      </p>

      <h2>8. International transfers</h2>
      <p>
        CallEscort24 operates servers in regions used by our hosting provider. By using the service you
        understand that your information may be processed outside your country of residence.
      </p>

      <h2>9. Children</h2>
      <p>CallEscort24 is not directed to children under 16. We do not knowingly collect data from children.</p>

      <h2>10. Changes</h2>
      <p>
        We may update this Privacy Policy. Material changes will be highlighted on the site. The "Last
        updated" date above always reflects the current version.
      </p>

      <h2>11. Contact</h2>
      <p>
        Questions or requests? Email <a href="mailto:support@callescort24.com">support@callescort24.com</a>{" "}
        or use our <Link to="/contact">contact page</Link>.
      </p>
    </LegalLayout>
  );
}
