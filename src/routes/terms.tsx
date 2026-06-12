import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalLayout } from "@/components/LegalLayout";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — CallEscort24" },
      { name: "description", content: "Terms governing use of CallEscort24, an adult escort directory and classified advertising platform for independent advertisers." },
      { property: "og:title", content: "Terms of Service — CallEscort24" },
      { property: "og:description", content: "The rules governing CallEscort24, an adult classified directory for independent advertisers." },
      { property: "og:url", content: "https://callescort24.org/terms" },
    ],
    links: [{ rel: "canonical", href: "https://callescort24.org/terms" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" updated="June 12, 2026">
      <p>
        Welcome to <strong>CallEscort24</strong> ("we", "us", "our"). CallEscort24 is an adult
        classified advertising directory accessible at{" "}
        <a href="https://callescort24.org">callescort24.org</a> where independent adult service
        providers ("Advertisers") publish listings and visitors ("Visitors") may contact them
        directly. These Terms of Service ("Terms") form a binding agreement between you and
        CallEscort24. By accessing the site, creating an account, or posting a listing you accept
        these Terms in full. If you do not agree, you must not use the service.
      </p>

      <h2>1. Eligibility — strictly 18+</h2>
      <ul>
        <li>You must be at least <strong>18 years old</strong> (or the age of majority in your jurisdiction, whichever is higher).</li>
        <li>You must have the legal capacity to enter into binding contracts.</li>
        <li>Viewing adult content must be lawful in your country, state, or region.</li>
        <li>You confirm that you are accessing the site of your own free will and are not offended by adult material.</li>
      </ul>

      <h2>2. Our role — directory only, no endorsement</h2>
      <p>
        CallEscort24 is <strong>only a classified advertising platform</strong>. We do not provide,
        offer, broker, arrange, or endorse any services advertised on the site. We are not a party
        to any communication, agreement, or transaction between Visitors and Advertisers. All
        Advertisers are independent third parties and are solely responsible for the content,
        legality, accuracy, and performance of their listings.
      </p>
      <p>
        Nothing on this site constitutes an offer of, solicitation for, or agreement to provide
        sexual services in exchange for money where doing so is illegal. Advertisers and Visitors
        are responsible for complying with the laws that apply to them.
      </p>

      <h2>3. Prohibited content and conduct — zero tolerance</h2>
      <p>The following are strictly forbidden and will result in immediate removal, permanent ban, and reporting to law enforcement where applicable:</p>
      <ul>
        <li><strong>Any content involving minors</strong> (anyone under 18), whether real, fictional, simulated, or AI-generated.</li>
        <li><strong>Human trafficking, coercion, exploitation, or non-consensual content</strong> of any kind.</li>
        <li>Content depicting violence, rape, bestiality, incest, necrophilia, or other illegal acts.</li>
        <li>Listings advertising drugs, weapons, stolen goods, identity documents, or other illegal items.</li>
        <li>Impersonation, identity theft, or use of another person's photos or likeness without consent.</li>
        <li>Doxxing, harassment, threats, hate speech, or discriminatory content.</li>
        <li>Spam, scraping, automated mass posting, phishing, malware, or circumvention of security controls.</li>
        <li>Fraud, money laundering, tax evasion, or any activity that violates applicable law.</li>
      </ul>
      <p>
        We cooperate with the National Center for Missing &amp; Exploited Children (NCMEC), Interpol,
        and other authorities when illegal content is identified.
      </p>

      <h2>4. Advertiser responsibilities</h2>
      <ul>
        <li>You are at least 18 and every person depicted in your listing is at least 18.</li>
        <li>You own or have full rights to every photo, video, and text you upload.</li>
        <li>Your listing accurately reflects who you are and what you advertise.</li>
        <li>You comply with every law that applies to you — including local rules on advertising, taxation, immigration, and adult services.</li>
        <li>You agree to identity verification (KYC) when requested. We may require government-issued ID, a selfie, and proof of age before publishing or at any time afterward.</li>
        <li>You may not list services that are illegal in the jurisdiction where the service would be performed.</li>
        <li>You indemnify CallEscort24 against any claims arising from your listing.</li>
      </ul>

      <h2>5. Visitor responsibilities</h2>
      <ul>
        <li>You will treat Advertisers with respect and dignity.</li>
        <li>You will not contact an Advertiser to request or arrange anything illegal.</li>
        <li>You will not record, share, or redistribute private communications without consent.</li>
        <li>You take full responsibility for any meeting you arrange with an Advertiser, including verifying their identity and ensuring your own safety.</li>
      </ul>

      <h2>6. Account rules</h2>
      <ul>
        <li>One person, one account. Multi-accounting to evade limits or bans is prohibited.</li>
        <li>You are responsible for everything done from your account and for keeping credentials secret.</li>
        <li>You must notify us immediately of unauthorized access.</li>
      </ul>

      <h2>7. Payments, credits, and refunds</h2>
      <p>
        Paid features (listing bumps, featured placements, verification badges) are billed as
        wallet credits purchased via supported payment methods, including cryptocurrency.
      </p>
      <ul>
        <li>All purchases are <strong>final and non-refundable</strong> except where required by law.</li>
        <li>Wallet credits have no cash value and cannot be transferred or withdrawn.</li>
        <li>Chargebacks or payment reversals will result in immediate account suspension.</li>
        <li>Prices may change at any time; the price shown at checkout applies to that purchase.</li>
      </ul>

      <h2>8. Content licence and DMCA</h2>
      <p>
        You retain ownership of content you upload. You grant CallEscort24 a worldwide, non-exclusive,
        royalty-free licence to host, store, reproduce, display, and distribute that content as
        needed to operate, promote, and improve the service.
      </p>
      <p>
        If you believe content on the service infringes your copyright or uses your image without
        consent, follow our <Link to="/dmca">DMCA / Image Removal Policy</Link> to submit a takedown
        notice. We respond to valid notices promptly.
      </p>

      <h2>9. Record-keeping and verification</h2>
      <p>
        Where required by law, Advertisers must provide and keep on file documentation proving the
        age and identity of every person depicted in their content. CallEscort24 retains verification
        records associated with paid listings for as long as required by applicable record-keeping
        rules.
      </p>

      <h2>10. Moderation and termination</h2>
      <p>
        We may remove any listing, suspend any account, refuse service, or terminate access at any
        time — with or without notice — for any reason we consider necessary to protect users, the
        platform, or to comply with the law. You may close your account at any time from your
        dashboard; we may retain certain records as required by law.
      </p>

      <h2>11. Disclaimers</h2>
      <p>
        The service is provided "as is" and "as available" without warranties of any kind, express
        or implied. We do not verify Advertisers beyond the documentation they provide and we do
        not guarantee the accuracy of any listing, the legality of any service, or the safety of
        any interaction. You use the service entirely at your own risk.
      </p>

      <h2>12. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, CallEscort24 shall not be liable for any indirect,
        incidental, special, consequential, or punitive damages, or any loss of profits, revenue,
        data, reputation, or goodwill arising from your use of the service or from any interaction
        between Visitors and Advertisers. Our aggregate liability shall not exceed the greater of
        (a) the amounts you paid to CallEscort24 in the twelve months preceding the claim, or (b)
        USD 100.
      </p>

      <h2>13. Indemnity</h2>
      <p>
        You agree to indemnify and hold CallEscort24, its officers, employees, and affiliates
        harmless from any claims, damages, fines, or expenses (including reasonable legal fees)
        arising from your listings, your conduct, your interactions with other users, or your
        violation of these Terms or any law.
      </p>

      <h2>14. Governing law and disputes</h2>
      <p>
        These Terms are governed by the laws of the jurisdiction in which CallEscort24 is
        established, excluding conflict-of-law rules. Before filing a claim, you agree to first
        attempt informal resolution by contacting us through our{" "}
        <Link to="/contact">contact page</Link>. If a dispute is not resolved within 60 days, you
        and CallEscort24 agree to resolve any remaining dispute through final and binding
        individual arbitration, and not in a class, collective, or representative action. Nothing
        in this section prevents either party from seeking injunctive relief or, where mandatory
        consumer law grants you the right to bring proceedings elsewhere, from doing so.
      </p>

      <h2>15. Changes</h2>
      <p>
        We may update these Terms at any time. Material changes will be highlighted on the site.
        Continued use after changes are posted constitutes acceptance of the updated Terms.
      </p>

      <h2>16. Contact</h2>
      <p>
        Questions, abuse reports, or legal notices? Reach us through our{" "}
        <Link to="/contact">contact page</Link>. Abuse reports involving minors or trafficking are
        reviewed with the highest priority.
      </p>
    </LegalLayout>
  );
}
