import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage } from "@/components/layout/legal-page";

import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Privacy Policy",
  description: "How Anvil, a ByteTech LLC product, collects and uses information.",
  path: "/privacy",
});

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
        summary, custom problem lists, notes you save on lessons, coding problems, and system design (including saved Ask
        AI replies), and submissions (your source code, language, pass/fail status, and runtime metrics). Mock interviews
        store the session, your messages, interviewer messages, and generated feedback.
      </p>
      <p>
        <strong className="text-foreground">Optional AI settings.</strong> If you save an LLM provider API key in
        Settings, we store it encrypted and keep a short hint of the key. Questions you send to “Ask AI” on a lesson, and
        mock-interview dialogue, are sent to the language-model provider you selected so a reply can be generated. If you
        save an Ask AI reply as a note, that text is stored with your account.
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

      <h2>Essential cookies and storage</h2>
      <p>
        Some cookies and browser storage are needed for Anvil to work. They are always active because they support core
        functionality. They are not used for Google Analytics, marketing, or building an advertising profile. You cannot
        turn Essential off.
      </p>
      <p>
        <strong className="text-foreground">Authentication / session.</strong> When you log in or register we set an
        HTTP-only cookie named{" "}
        <code className="rounded bg-steel-800 px-1 py-0.5 font-mono text-[13px] text-accent-light">ia_access_token</code>
        . It holds a session token so the site can recognize you. It is set only after you sign in. It expires after
        about seven days, or when you log out.
      </p>
      <p>
        <strong className="text-foreground">Account and application data (server).</strong> If you have an account we
        store it in our database so core features work: profile, learning progress, completed problems, submissions,
        custom lists, and mock interview history. That data is part of providing the product, not optional analytics.
      </p>
      <p>
        <strong className="text-foreground">Browser storage (your device).</strong> Anvil uses local and session storage
        for preferences and drafts, including:
      </p>
      <ul>
        <li>Theme preference (light or dark).</li>
        <li>Draft code for problems you have opened, and the editor split width.</li>
        <li>System design simulator graphs and results you save locally.</li>
        <li>A short-lived mock-interview session identifier in session storage.</li>
        <li>Your analytics cookie choice, so we remember Accept or Reject.</li>
      </ul>
      <p>
        This browser data stays on your device unless you later submit related content to the service (for example by
        submitting code). We do not currently offer a separate “notes” feature.
      </p>

      <h2>Optional Google Analytics</h2>
      <p>
        Analytics is optional and off until you enable it. If you choose{" "}
        <strong className="text-foreground">Accept all</strong> or turn Analytics on in Cookie settings, we load Google
        Analytics 4. Google may then set cookies such as{" "}
        <code className="rounded bg-steel-800 px-1 py-0.5 font-mono text-[13px] text-accent-light">_ga</code> and receive
        page views and product events (for example sign-up or login), including technical data such as IP address under
        Google’s terms.
      </p>
      <p>
        Analytics cookies are not set until you opt in. Ignoring the banner, choosing{" "}
        <strong className="text-foreground">Reject optional</strong>, or saving preferences with Analytics unchecked
        means GA4 is not loaded.
      </p>

      <h2>If you reject or disable analytics</h2>
      <p>
        Google Analytics does not run: no <code className="rounded bg-steel-800 px-1 py-0.5 font-mono text-[13px] text-accent-light">gtag.js</code>
        , no <code className="rounded bg-steel-800 px-1 py-0.5 font-mono text-[13px] text-accent-light">_ga</code> cookies,
        no GA4 page views, and our analytics helpers do nothing. We do not replace that with other tracking, unique
        analytics profiles, marketing attribution, or fingerprinting.
      </p>
      <p>
        If you previously enabled Analytics and then turn it off, we stop future GA4 tracking immediately, do not load
        GA4 on later visits, and remove first-party Google Analytics cookies where the browser allows. Essential cookies,
        sign-in, progress, drafts, and theme are not affected.
      </p>
      <p>
        Core features still work. You can change your Analytics preference later with Cookie settings in the footer,
        which opens the preferences dialog.
      </p>

      <h2>How we use information</h2>
      <ul>
        <li>To create and maintain your account and keep you signed in.</li>
        <li>To show your dashboard, progress, lists, submissions, and interview history.</li>
        <li>To run your code in an isolated sandbox and return test results.</li>
        <li>To run mock interviews and lesson tutoring when you ask for them.</li>
        <li>To generate lesson audio when you press Listen.</li>
        <li>If you accept analytics, to understand which pages and features are used, via Google Analytics.</li>
        <li>To keep the service running and debug failures.</li>
      </ul>
      <p>We do not sell your personal information.</p>

      <h2>Third-party services</h2>
      <ul>
        <li>
          <strong className="text-foreground">Google Analytics 4</strong> — only if you accept analytics. Google may
          process usage data, including IP address, under its own terms. If you reject, this service is not loaded.
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
        Where GDPR applies, we process account, session, and progress data to provide the service you request (contract)
        and to operate the site (legitimate interests). Essential cookies and storage are not optional analytics.
        Google Analytics cookies are processed only if you enable Analytics. You may change that preference with Cookie
        settings.
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
        <li>
          You can reject optional analytics or turn Analytics off in Cookie settings. Essential storage stays on. Core
          features still work without Google Analytics.
        </li>
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
