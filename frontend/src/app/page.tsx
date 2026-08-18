import Link from "next/link";
import { Binary, BookOpen, Code2, ListChecks, MessageSquare, Network, Sparkles, Zap } from "lucide-react";

import { HeroPreview } from "@/components/landing/hero-preview";
import { HomeGate } from "@/components/landing/home-gate";
import { PublicHeader } from "@/components/layout/public-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    title: "DSA & Coding",
    body: "Practice interview patterns, algorithms, and coding problems.",
    icon: Binary,
    href: "/problems",
  },
  {
    title: "System Design",
    body: "Learn scalable architecture, capacity estimation, APIs, databases, caching, and distributed systems.",
    icon: Network,
    href: "/system-design",
  },
  {
    title: "AI & Machine Learning",
    body: "Prepare for modern AI interviews covering ML, LLMs, RAG, agents, and production AI.",
    icon: Sparkles,
    href: "/learn/ai-ml",
  },
  {
    title: "Mock Interviews",
    body: "Simulate real interviews and receive structured feedback on your approach, communication, and solution.",
    icon: MessageSquare,
    href: "/problems",
  },
];

const STEPS = [
  { n: "01", title: "Solve", body: "Practice realistic interview problems.", icon: Code2 },
  { n: "02", title: "Learn", body: "Understand the concepts and patterns behind them.", icon: BookOpen },
  { n: "03", title: "Interview", body: "Practice explaining your thinking through mock interviews.", icon: MessageSquare },
  { n: "04", title: "Improve", body: "Review interview feedback, target weak areas, and use cheat sheets.", icon: ListChecks },
];

export default function HomePage() {
  return (
    <HomeGate>
    <div className="flex min-h-screen w-full max-w-[100vw] flex-col overflow-x-clip">
      <PublicHeader />
      <main>
        <section className="relative overflow-hidden border-b border-steel-800">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-0 h-[28rem] w-[46rem] -translate-x-1/2 bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--accent)_16%,transparent),transparent)]" />
            <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(var(--steel-800)_1px,transparent_1px),linear-gradient(90deg,var(--steel-800)_1px,transparent_1px)] [background-size:52px_52px] [mask-image:linear-gradient(to_bottom,black,transparent_78%)]" />
          </div>
          <div className="ia-content relative pt-14 pb-12 sm:pt-16 sm:pb-14 lg:pt-20 lg:pb-16">
            <div className="max-w-2xl">
              <p className="inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent/10 px-2.5 py-1 text-[12px] font-medium text-accent">
                <Zap className="h-3.5 w-3.5" aria-hidden />
                Forge Your Interview Skills
              </p>
              <h1 className="mt-3 text-[2rem] font-semibold leading-[1.1] tracking-tight text-balance sm:text-[3rem] lg:text-[3.25rem]">
                Build skills.
                <br />
                Break limits.
                <br />
                Ace the interview.
              </h1>
              <p className="mt-4 max-w-xl text-[15px] leading-7 text-[#475569] dark:text-zinc-300">
                Everything you need to prepare for software engineering interviews — coding, system design, AI/ML,
                AI-powered mock interviews, and focused practice.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button asChild size="lg">
                  <Link href="/problems">Start Practicing</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-[#CBD5E1] bg-white/80 text-foreground hover:bg-white dark:border-zinc-500 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-400 dark:hover:bg-zinc-800"
                >
                  <Link href="/learn">Explore Learning</Link>
                </Button>
              </div>
            </div>

            <div className="mt-6">
              <HeroPreview />
            </div>
          </div>
        </section>

        <section className="border-b border-steel-800 bg-steel-900">
          <div className="ia-content py-10 lg:py-12">
            <p className="text-center text-[11px] font-medium uppercase tracking-[0.16em] text-accent">Features</p>
            <h2 className="mt-1.5 text-center text-xl font-semibold tracking-tight sm:text-2xl">
              Everything you need for the interview.
            </h2>
            <div className="mt-6 overflow-hidden rounded-2xl border border-steel-800">
              <div className="grid gap-px bg-steel-800 sm:grid-cols-2">
                {FEATURES.map((item) => (
                  <Link
                    key={item.title}
                    href={item.href}
                    className="group flex cursor-pointer items-start gap-3.5 bg-steel-900 px-5 py-5 transition-colors hover:bg-steel-950/60 sm:px-6 sm:py-6"
                  >
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent/20 bg-accent/10 text-accent transition-colors group-hover:border-accent/35 group-hover:bg-accent/15">
                      <item.icon className="h-5 w-5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold tracking-tight">{item.title}</h3>
                      <p className="mt-1 max-w-sm text-[13px] leading-6 text-muted-foreground">{item.body}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-steel-800 bg-[color-mix(in_srgb,var(--accent)_5%,var(--background))]">
          <div className="ia-content py-8 lg:py-10">
            <p className="text-center text-[11px] font-medium uppercase tracking-[0.16em] text-accent">How it works</p>
            <h2 className="mt-1.5 text-center text-xl font-semibold tracking-tight sm:text-2xl">Practice with a purpose.</h2>
            <ol className="mt-5 flex flex-col md:flex-row">
              {STEPS.map((step, index) => {
                const last = index === STEPS.length - 1;
                return (
                  <li key={step.n} className="flex min-w-0 gap-4 md:flex-1 md:flex-col">
                    <div className="flex flex-col items-center md:flex-row md:items-center">
                      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-accent/25 bg-steel-900 text-accent">
                        <step.icon className="h-4 w-4" aria-hidden />
                      </span>
                      {last ? null : (
                        <span
                          aria-hidden
                          className="w-px min-h-6 flex-1 bg-steel-700 md:mx-3 md:h-px md:min-h-0 md:w-auto md:min-w-4 md:flex-1"
                        />
                      )}
                    </div>
                    <div className={last ? "pb-0 pt-0.5 md:pt-3" : "pb-6 pt-0.5 md:pb-0 md:pr-4 md:pt-3"}>
                      <p className="text-[11px] font-medium tabular-nums tracking-[0.12em] text-accent">{step.n}</p>
                      <h3 className="mt-0.5 text-sm font-semibold tracking-tight">{step.title}</h3>
                      <p className="mt-1 max-w-[18ch] text-[13px] leading-5 text-muted-foreground md:max-w-none">
                        {step.body}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        <section className="bg-[color-mix(in_srgb,var(--accent)_8%,var(--steel-900))]">
          <div className="ia-content py-14 lg:py-16">
            <div className="rounded-2xl border border-steel-800 bg-[color-mix(in_srgb,var(--accent)_6%,var(--steel-900))] px-6 py-8 sm:px-8 lg:flex lg:items-start lg:justify-between lg:gap-16 lg:px-10 lg:py-10">
              <h2 className="max-w-[22ch] text-xl font-semibold tracking-tight sm:text-2xl">
                One workflow for the entire interview loop.
              </h2>
              <div className="mt-4 max-w-xl lg:mt-0">
                <p className="text-[15px] leading-7 text-muted-foreground">
                  Practice problems, learn the underlying concepts, prepare for system design and AI/ML interviews,
                  simulate interviews, and review your weak areas with focused cheat sheets.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button asChild>
                    <Link href="/problems">Start Practicing</Link>
                  </Button>
                  <Button asChild variant="secondary">
                    <Link href="/learn">Explore Learning</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
    </HomeGate>
  );
}
