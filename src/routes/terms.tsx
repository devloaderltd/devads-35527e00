import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalLayout } from "@/components/LegalLayout";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Marketly" },
      { name: "description", content: "The rules and conditions governing the use of Marketly's online marketplace." },
      { property: "og:title", content: "Terms of Service — Marketly" },
      { property: "og:description", content: "The rules of the road for buying, selling and posting on Marketly." },
      { property: "og:url", content: "https://devads.lovable.app/terms" },
    ],
    links: [{ rel: "canonical", href: "https://devads.lovable.app/terms" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" updated="May 25, 2026">
      <p>
        Welcome to Marketly. These Terms of Service ("Terms") form a binding agreement between you and
        Marketly governing your use of our marketplace, accessible at{" "}
        <a href="https://devads.lovable.app">devads.lovable.app</a>. By creating an account, posting a listing,
        or otherwise using the service you accept these Terms in full.
      </p>

      <h2>1. Eligibility</h2>
      <p>
        You must be at least 18 years old (or the age of majority in your jurisdiction) and able to enter
        into a binding contract. You must provide accurate information and keep your account credentials
        secure.
      </p>

      <h2>2. Your account</h2>
      <ul>
        <li>You are responsible for all activity on your account.</li>
        <li>One person, one account. Multiple accounts to evade limits, suspensions or bans are prohibited.</li>
        <li>Notify us immediately of any unauthorized access.</li>
      </ul>

      <h2>3. Marketplace role</h2>
      <p>
        Marketly is a venue that connects buyers and sellers. We are <strong>not</strong> a party to any
        transaction between users. We do not pre-screen listings, do not take possession of items, do not
        handle payments between buyer and seller (except where explicitly offered), and provide no warranty
        on items listed.
      </p>

      <h2>4. Listings</h2>
      <ul>
        <li>You may only list items you own and have the right to sell.</li>
        <li>Listings must accurately describe the item, condition, price, and location.</li>
        <li>You are responsible for compliance with all applicable laws (taxes, import/export, consumer rights).</li>
        <li>We may remove listings, suspend accounts, or refuse service at our discretion when content violates these Terms or applicable law.</li>
      </ul>

      <h3>Prohibited items and conduct</h3>
      <ul>
        <li>Illegal goods, weapons, drugs, stolen items, counterfeit or recalled products.</li>
        <li>Adult content, hate speech, harassment, threats, doxxing, or discriminatory content.</li>
        <li>Spam, repeated low-quality listings, manipulated reviews, fake engagement.</li>
        <li>Phishing, malware, scraping, automated mass posting, or circumventing security controls.</li>
        <li>Tax evasion, money laundering, or other unlawful financial activity.</li>
      </ul>

      <h2>5. Promotions and paid features</h2>
      <p>
        We offer paid features such as listing bumps and featured placements. Prices, durations and
        availability are shown at purchase time and may change. Wallet credits and promotional purchases
        are generally non-refundable except where required by law.
      </p>

      <h2>6. Wallet and payments</h2>
      <p>
        Wallet balances are denominated in USD and can be topped up via supported payment methods
        (including cryptocurrency). Once credited, wallet funds may be spent on Marketly features. Refunds
        and chargebacks may result in deduction of the corresponding wallet credit.
      </p>

      <h2>7. Content licence</h2>
      <p>
        You retain ownership of content you upload. You grant Marketly a worldwide, non-exclusive,
        royalty-free licence to host, display, reproduce, and distribute that content as needed to operate
        and promote the service.
      </p>

      <h2>8. Reviews and reports</h2>
      <p>
        Reviews must be honest and based on a real interaction. We may remove reviews that violate these
        Terms. Users may report listings or other users they believe violate our rules; we will review
        reports in good faith but cannot guarantee any specific outcome.
      </p>

      <h2>9. Suspension and termination</h2>
      <p>
        We may suspend or terminate access at any time, with or without notice, for violations of these
        Terms, suspected fraud, or to protect the platform and its users. You may close your account at
        any time via the dashboard.
      </p>

      <h2>10. Disclaimers</h2>
      <p>
        The service is provided "as is" and "as available" without warranties of any kind, whether
        express or implied, including merchantability, fitness for a particular purpose, and
        non-infringement. We do not warrant that listings are accurate, that users are who they claim to
        be, or that the service will be uninterrupted or error-free.
      </p>

      <h2>11. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, Marketly shall not be liable for any indirect,
        incidental, special, consequential, or punitive damages, or any loss of profits, revenue, data, or
        goodwill arising from your use of the service. Our aggregate liability shall not exceed the
        greater of (a) the amounts you paid to Marketly in the twelve months preceding the claim, or
        (b) USD 100.
      </p>

      <h2>12. Indemnity</h2>
      <p>
        You agree to indemnify and hold Marketly, its officers, employees, and affiliates harmless from
        any claims, damages, or expenses (including reasonable legal fees) arising from your listings,
        your use of the service, or your violation of these Terms.
      </p>

      <h2>13. Governing law and disputes</h2>
      <p>
        These Terms are governed by the laws of the jurisdiction in which Marketly is established,
        excluding conflict-of-law principles. Disputes shall be resolved in the competent courts of that
        jurisdiction, except where mandatory consumer law grants you the right to bring proceedings
        elsewhere.
      </p>

      <h2>14. Changes</h2>
      <p>
        We may update these Terms from time to time. Continued use of Marketly after changes are posted
        constitutes acceptance of the updated Terms.
      </p>

      <h2>15. Contact</h2>
      <p>
        Questions? Reach us through our <Link to="/contact">contact page</Link>.
      </p>
    </LegalLayout>
  );
}
