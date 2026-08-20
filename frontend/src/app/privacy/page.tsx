import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage } from "@/components/layout/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Anvil, a ByteTech LLC product, collects and uses information.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="20 August 2026">
      <p>
        This policy describes how ByteTech LLC (“ByteTech,” “we”) handles information when you use Anvil (also referred
        to as AnvilPrep), our interview-preparation website and application.
      </p>
      <p>
        It matches the product as it works today. We do not describe practices we do not currently implement.
      </p>

      <h2>Who is responsible</h2>
      <p>
        ByteTech LLC operates Anvil. We have not yet published a dedicated privacy email address. Until we do, privacy
        requests can be sent through the same channel you already use to reach us about the product. See{" "}
        <Link href="/about">About</Link>.
      </p>

      <h2>Information we collect</h2>
      <p>What we store depends on how you use Anvil.</p>
      <p>
        <strong className="text-foreground">If you create an account.</strong> We store the email address, username, and
        a hashed password you provide at registration. You may later add a display name, country, LinkedIn, GitHub, or
        website URL, and an optional profile picture.
      </p>
      <p>
        <strong className="text-foreground">Learning and practice data.</strong> When you are signed in we store lesson
        progress (including started and completed lessons), coding problem progress and attempt counts, a daily activity
        summary, custom problem lists, and submissions (your source code, language, pass/fail status, and runtime
        metrics). Mock interviews store the session, your messages, interviewer messages, and generated feedback.
      </p>
      <p>
        <strong className="text-foreground">Optional AI settings.</strong> If you save an LLM provider API key in
        Settings, we store it encrypted and keep a short hint of the key. Questions you send to “Ask AI” on a lesson, and
        mock-interview dialogue, are sent to the language-model provider you selected so a reply can be generated. We do
        not currently keep a separate long-term “notes” product; content you type in interviews and the editor is stored
        as described above.
      </p>
      <p>
        <strong className="text-foreground">Listen / speech.</strong> If you use Listen on a lesson, the lesson text is
        sent to our speech service so audio can be generated.
      </p>
      <p>
        <strong className="text-foreground">Public profile.</strong> Your username, display name, avatar, country, and
        public progress (solved counts, streak, activity calendar) can appear at a public URL of the form{" "}
        <code className="rounded bg-steel-800 px-1 py-0.5 font-mono text-[13px] text-accent-light">/u/your-username</code>
        .
      </p>
      <p>
        <strong className="text-foreground">Technical data.</strong> Our servers receive the usual connection data needed
        to serve the site (for example IP address and request logs at the hosting layer). We do not currently operate a
        separate advertising profile.
      </p>

      <h2>Information stored only in your browser</h2>
      <ul>
        <li>Theme preference (light or dark).</li>
        <li>Draft code for problems you have opened, and the editor split width.</li>
        <li>System design simulator graphs and results you save locally.</li>
        <li>A short-lived mock-interview session identifier in session storage.</li>
        <li>Your analytics cookie choice, if Google Analytics is enabled on this deployment.</li>
      </ul>
      <p>This data stays on your device unless you later submit related content to the service (for example by submitting code).</p>

      <h2>Cookies</h2>
      <p>
        <strong className="text-foreground">Sign-in cookie (necessary).</strong> When you log in or register we set an
        HTTP-only cookie named <code className="rounded bg-steel-800 px-1 py-0.5 font-mono text-[13px] text-accent-light">ia_access_token</code>
        . It holds a session token so the site can recognize you. It is not used for advertising. It expires after about
        seven days, or when you log out.
      </p>
      <p>
        <strong className="text-foreground">Analytics cookies (optional).</strong> If you accept analytics, Google
        Analytics 4 may set cookies such as <code className="rounded bg-steel-800 px-1 py-0.5 font-mono text-[13px] text-accent-light">_ga</code>{" "}
        to measure page views and product events (for example sign-up or login). These cookies are not set until you
        choose “Accept analytics.” You can change that choice later with Cookie settings in the footer.
      </p>

      <h2>How we use information</h2>
      <ul>
        <li>To create and maintain your account and keep you signed in.</li>
        <li>To show your dashboard, progress, lists, submissions, and interview history.</li>
        <li>To run your code in an isolated sandbox and return test results.</li>
        <li>To run mock interviews and lesson tutoring when you ask for them.</li>
        <li>To generate lesson audio when you press Listen.</li>
        <li>If you consent, to understand which pages and features are used, via Google Analytics.</li>
        <li>To keep the service secure and debug failures.</li>
      </ul>
      <p>We do not sell your personal information.</p>

      <h2>Third-party services</h2>
      <ul>
        <li>
          <strong className="text-foreground">Google Analytics 4</strong> — only after you accept analytics. Google may
          process usage data, including IP address, under its own terms.
        </li>
        <li>
          <strong className="text-foreground">Language-model providers</strong> — Ollama or a provider whose API key you
          save (for example OpenAI, Google Gemini, or OpenRouter). Prompt text you send is processed by that provider.
        </li>
        <li>
          <strong className="text-foreground">Speech synthesis</strong> — lesson text is sent to our configured TTS
          service when you use Listen.
        </li>
        <li>
          <strong className="text-foreground">Hosting and database</strong> — the application and PostgreSQL database
          that store accounts and progress.
        </li>
      </ul>

      <h2>Legal bases (EEA/UK)</h2>
      <p>
        Where GDPR applies, we process account and progress data to provide the service you request (contract) and to
        keep the service secure (legitimate interests). Optional analytics cookies are processed only with your consent.
        You may withdraw analytics consent at any time using Cookie settings.
      </p>

      <h2>Retention and deletion</h2>
      <p>
        Account and progress data are kept while your account exists. The product does not yet include a self-serve
        account deletion button. You can request deletion of your account and associated server-stored data by contacting
        us. Browser-only data can be cleared by clearing this site’s storage in your browser.
      </p>

      <h2>Your choices</h2>
      <ul>
        <li>You can use much of the catalog without an account.</li>
        <li>You can edit or remove profile fields and your avatar in Settings.</li>
        <li>You can reject analytics cookies; the site still works.</li>
        <li>You can log out, which clears the sign-in cookie.</li>
      </ul>

      <h2>Children</h2>
      <p>Anvil is intended for adults preparing for professional software interviews, not for children.</p>

      <h2>Changes</h2>
      <p>
        If we change how we collect or use information in a material way, we will update this page and the date above.
      </p>
    </LegalPage>
  );
}
