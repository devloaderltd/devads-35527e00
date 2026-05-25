import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalLayout } from "@/components/LegalLayout";

export const Route = createFileRoute("/dmca")({
  head: () => ({
    meta: [
      { title: "DMCA Copyright Policy — Marketly" },
      { name: "description", content: "How to submit a DMCA takedown notice or counter-notification for content on Marketly." },
      { property: "og:title", content: "DMCA Copyright Policy — Marketly" },
      { property: "og:description", content: "Report copyright infringement on Marketly under the DMCA." },
      { property: "og:url", content: "https://devads.lovable.app/dmca" },
    ],
    links: [{ rel: "canonical", href: "https://devads.lovable.app/dmca" }],
  }),
  component: DmcaPage,
});

function DmcaPage() {
  return (
    <LegalLayout title="DMCA Policy" updated="May 25, 2026">
      <p>
        Marketly respects the intellectual property rights of others and expects users of the service to
        do the same. In accordance with the Digital Millennium Copyright Act of 1998 (the "DMCA"), 17
        U.S.C. § 512, we will respond expeditiously to claims of copyright infringement committed using
        the Marketly service that are reported to our Designated Copyright Agent at the contact below.
      </p>

      <h2>1. Filing a takedown notice</h2>
      <p>
        If you are a copyright owner (or authorized to act on behalf of one) and believe that material on
        Marketly infringes your copyright, please send a written notification to our Designated Agent
        that includes substantially the following (per 17 U.S.C. § 512(c)(3)):
      </p>
      <ul>
        <li>A physical or electronic signature of the copyright owner or person authorized to act on their behalf.</li>
        <li>Identification of the copyrighted work claimed to have been infringed.</li>
        <li>Identification of the material that is claimed to be infringing, with information reasonably sufficient to let us locate it (URLs of the listing(s) work best).</li>
        <li>Your contact information, including your address, telephone number, and email address.</li>
        <li>A statement that you have a good faith belief that use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law.</li>
        <li>A statement, made under penalty of perjury, that the information in the notice is accurate and that you are the copyright owner or are authorized to act on the owner's behalf.</li>
      </ul>

      <h2>2. Designated Copyright Agent</h2>
      <p>
        Send DMCA notices to our Designated Copyright Agent:
      </p>
      <ul>
        <li>Email: <a href="mailto:dmca@marketly.example">dmca@marketly.example</a></li>
        <li>Subject line: <em>DMCA Takedown Notice</em></li>
      </ul>
      <p>
        Notices that are incomplete or that do not substantially comply with the requirements above may
        not be actionable.
      </p>

      <h2>3. Counter-notification</h2>
      <p>
        If you believe that material you posted was removed or disabled by mistake or misidentification,
        you may file a counter-notification with our Designated Agent containing:
      </p>
      <ul>
        <li>Your physical or electronic signature.</li>
        <li>Identification of the material removed and its location before removal.</li>
        <li>A statement under penalty of perjury that you have a good faith belief that the material was removed or disabled as a result of mistake or misidentification.</li>
        <li>Your name, address, and telephone number, and a statement that you consent to the jurisdiction of the federal court in the district where you are located (or, if outside the United States, in any judicial district in which Marketly may be found) and that you will accept service of process from the person who provided the original notice or an agent of such person.</li>
      </ul>

      <h2>4. Repeat infringer policy</h2>
      <p>
        It is Marketly's policy, in appropriate circumstances and at our sole discretion, to disable
        and/or terminate the accounts of users who are repeat infringers.
      </p>

      <h2>5. Misrepresentations</h2>
      <p>
        Please note that under 17 U.S.C. § 512(f), any person who knowingly materially misrepresents that
        material or activity is infringing, or that material was removed or disabled by mistake or
        misidentification, may be subject to liability for damages, including costs and attorneys' fees.
      </p>

      <h2>6. Related policies</h2>
      <p>
        See our <Link to="/terms">Terms of Service</Link> for the broader rules of the platform and our{" "}
        <Link to="/privacy">Privacy Policy</Link> for how we handle personal data.
      </p>
    </LegalLayout>
  );
}
