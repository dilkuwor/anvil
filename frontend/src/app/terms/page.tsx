import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage } from "@/components/layout/legal-page";

import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Terms of Service",
  description: "Terms for using Anvil, a ByteTech LLC interview-preparation product.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="20 August 2026">
      <p>
        These terms govern your use of Anvil (also referred to as AnvilPrep), operated by ByteTech LLC. By creating an
        account or using the service, you agree to them. If you do not agree, do not use the service.
      </p>

      <h2>The service</h2>
      <p>
        Anvil is an interview-preparation product. You can browse lessons, coding problems, system-design material, and
        cheat sheets. With an account you can track progress, submit code, save problem lists, and run mock interviews.
        The product is provided as an evolving MVP. Features may change, break, or be withdrawn.
      </p>

      <h2>Accounts</h2>
      <ul>
        <li>You must provide a valid email, a username, and a password.</li>
        <li>You are responsible for activity on your account and for keeping your password confidential.</li>
        <li>Usernames may appear on a public profile page together with progress statistics you generate.</li>
        <li>We may suspend accounts that abuse the service or other users.</li>
      </ul>

      <h2>Your content</h2>
      <p>
        You keep ownership of code, interview answers, lists, and other material you submit. You grant ByteTech a
        license to store, display, and process that material solely to operate Anvil for you (for example, to run tests,
        show your dashboard, or generate interview feedback).
      </p>
      <p>
        Do not submit content you do not have the right to use, or content that is unlawful, harmful, or intended to
        disrupt the sandbox or other users.
      </p>

      <h2>Acceptable use</h2>
      <ul>
        <li>Do not attempt to break out of the code sandbox or attack the infrastructure.</li>
        <li>Do not scrape, overload, or reverse-engineer the service beyond ordinary use.</li>
        <li>Do not use another person’s account.</li>
        <li>Do not use Anvil to generate or distribute malware.</li>
      </ul>

      <h2>AI features</h2>
      <p>
        Mock interviews and Ask AI produce machine-generated text. Outputs can be wrong. They are study aids, not
        professional advice, and they are not a substitute for your own judgment in a real interview. If you supply your
        own LLM API key, you are also subject to that provider’s terms.
      </p>

      <h2>Privacy</h2>
      <p>
        How we handle information is described in the <Link href="/privacy">Privacy Policy</Link>.
      </p>

      <h2>Disclaimer</h2>
      <p>
        Anvil is provided “as is.” We do not warrant that practice on Anvil will result in a job offer, that content is
        complete or error-free, or that the service will be uninterrupted. To the extent permitted by law, ByteTech is
        not liable for lost offers, lost data, or indirect damages arising from use of the service.
      </p>

      <h2>Changes and contact</h2>
      <p>
        We may update these terms as the product changes. Continued use after an update means you accept the revised
        terms. The date at the top of this page is the latest revision. Operator: ByteTech LLC. See{" "}
        <Link href="/about">About</Link>.
      </p>
    </LegalPage>
  );
}
