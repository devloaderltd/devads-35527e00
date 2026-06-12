import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalLayout } from "@/components/LegalLayout";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — CallEscort24" },
      { name: "description", content: "How CallEscort24 — an adult classified directory — collects, uses, and protects personal data of Advertisers and Visitors." },
      { property: "og:title", content: "Privacy Policy — CallEscort24" },
      { property: "og:description", content: "Privacy practices for an adult classified directory." },
      { property: "og:url", content: "https://callescort24.org/privacy" },
    ],
    links: [{ rel: "canonical", href: "https://callescort24.org/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" updated="June 12, 2026">
      <p>
        This Privacy Policy explains how <strong>CallEscort24</strong> ("we", "us", "our") collects,
        uses, and protects information when you use our adult classified directory at{" "}
        <a href="https://callescort24.org">callescort24.org</a>. Because the service involves adult
        content and identity verification, we treat privacy with special care. By using
        CallEscort24 you agree to this policy.
      </p>

      <h2>1. Information we collect</h2>
      <h3>Information you give us</h3>
      <ul>
        <li><strong>Account details</strong>: display name, email address, hashed password, optional phone number, avatar, and bio.</li>
        <li><strong>Age and identity verification (KYC)</strong>: government-issued ID, selfie, and any supporting documents you upload for Advertiser verification. These are stored with restricted access and used only for compliance and fraud prevention.</li>
        <li><strong>Listing content</strong>: titles, descriptions, photos, videos, rates, services, availability, and location you publish.</li>
        <li><strong>Messages</strong>: communications you exchange with other users through our messaging system.</li>
        <li><strong>Reviews and reports</strong>: feedback, ratings, and abuse reports you submit.</li>
        <li><strong>Payment data</strong>: wallet top-ups, promotion purchases, and crypto-payment metadata. Card or crypto wallet details are handled by our payment processors — we never see full card numbers or wallet keys.</li>
      </ul>
      <h3>Information we collect automatically</h3>
      <ul>
        <li>Listing engagement events (views, favorites, contact reveals, messages opened) used for analytics, moderation, and fraud prevention.</li>
        <li>Device and connection metadata (IP address, browser, language, approximate location, referring URL, device fingerprint).</li>
        <li>Age-gate confirmation, theme, and city preferences stored locally — see our <Link to="/cookies">Cookies Policy</Link>.</li>
      </ul>

      <h2>2. How we use your information</h2>
      <ul>
        <li>To operate, secure, and improve the directory.</li>
        <li>To verify Advertiser age and identity and to comply with anti-trafficking and record-keeping laws.</li>
        <li>To authenticate you, prevent fraud, and enforce our <Link to="/terms">Terms of Service</Link>.</li>
        <li>To deliver listings, messaging, notifications, and saved-search alerts you request.</li>
        <li>To process wallet top-ups and listing promotions.</li>
        <li>To respond to abuse reports, DMCA notices, and law-enforcement requests.</li>
        <li>To send essential service announcements and, with your consent, marketing emails.</li>
      </ul>

      <h2>3. Legal bases (EU / UK users)</h2>
      <p>
        We process personal data on the bases of (a) contract performance, (b) our legitimate
        interests in operating a safe directory and preventing illegal activity, (c) your consent
        where required (e.g. marketing, non-essential cookies), and (d) compliance with legal
        obligations such as anti-trafficking, child protection, and record-keeping laws.
      </p>

      <h2>4. Sharing your information</h2>
      <ul>
        <li><strong>Public visibility</strong>: Advertiser display name, avatar, bio, city, listings, and reviews are visible to anyone who has accepted the age gate.</li>
        <li><strong>Service providers</strong>: hosting and CDN providers, payment processors, email senders, SMS providers, ID-verification vendors, and analytics. They are bound by data-protection agreements.</li>
        <li><strong>Law enforcement and authorities</strong>: when required by law, court order, or to protect users — particularly in cases involving minors, trafficking, or violence.</li>
        <li><strong>Business transfers</strong>: in the event of a merger, acquisition, or asset sale, your information may transfer with the business.</li>
      </ul>
      <p>
        We <strong>do not sell</strong> your personal data and we do not run third-party advertising trackers.
      </p>

      <h2>5. Data retention</h2>
      <ul>
        <li>Account data is kept while your account is active and for a reasonable period afterward for fraud prevention and legal claims.</li>
        <li>KYC and age-verification records are retained for as long as required by record-keeping law.</li>
        <li>Listings and messages are retained as needed for service operation and dispute resolution.</li>
        <li>You may delete individual listings at any time. To request full account deletion, contact us; certain records may be retained where required by law.</li>
      </ul>

      <h2>6. Your rights</h2>
      <p>
        Depending on your jurisdiction (GDPR, UK GDPR, CCPA, etc.) you may have the right to access,
        correct, delete, restrict, export, or object to the processing of your personal data, and
        to lodge a complaint with your local data protection authority. To exercise any of these
        rights, contact us at{" "}
        <a href="mailto:support@callescort24.com">support@callescort24.com</a>.
      </p>

      <h2>7. Security</h2>
      <p>
        We use industry-standard safeguards: HTTPS in transit, encrypted backups, hashed passwords,
        row-level security on our database, role-based access controls, and tightly restricted
        access to KYC records. No system is fully secure — please use a strong unique password and
        notify us immediately of any suspected unauthorized access.
      </p>

      <h2>8. International transfers</h2>
      <p>
        Our infrastructure providers operate servers in multiple regions. By using the service you
        understand that your information may be processed outside your country of residence,
        including in jurisdictions whose data-protection laws may differ from your own.
      </p>

      <h2>9. Children</h2>
      <p>
        CallEscort24 is strictly for adults. We do not knowingly collect data from anyone under 18.
        If you believe a minor has provided us with personal data, contact us immediately so we
        can remove it.
      </p>

      <h2>10. Changes</h2>
      <p>
        We may update this Privacy Policy. Material changes will be highlighted on the site. The
        "Last updated" date above always reflects the current version.
      </p>

      <h2>11. Contact</h2>
      <p>
        Questions, data-rights requests, or privacy concerns? Email{" "}
        <a href="mailto:support@callescort24.com">support@callescort24.com</a> or use our{" "}
        <Link to="/contact">contact page</Link>.
      </p>
    </LegalLayout>
  );
}
