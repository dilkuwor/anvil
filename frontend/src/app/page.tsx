import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Binary, BookOpen, Code2, ListChecks, MessageSquare, Network, Sparkles, Zap } from "lucide-react";

import { HeroDesignFloat } from "@/components/landing/hero-design-float";
import { HeroPreview } from "@/components/landing/hero-preview";
import { HomeGate } from "@/components/landing/home-gate";
import { PublicHeader } from "@/components/layout/public-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Button } from "@/components/ui/button";

import { SITE_DEFAULT_TITLE, SITE_DESCRIPTION, pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: { absolute: SITE_DEFAULT_TITLE },
  description: SITE_DESCRIPTION,
  path: "/",
});

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
    title: "Behavioral",
    body: "Build a bank of STAR stories, then sit a mock loop where the interviewer probes each one.",
    icon: MessageSquare,
    href: "/behavioral",
  },
  {
    title: "AI & Machine Learning",
    body: "Prepare for modern AI interviews covering ML, LLMs, RAG, agents, and production AI.",
    icon: Sparkles,
    href: "/learn/ai-ml",
  },
  {
    title: "Mock Interviews",
    body: "Coding, system design, and behavioral interviews with an AI interviewer and structured feedback.",
    icon: Code2,
    href: "/problems",
  },
  {
    title: "Cheat Sheets & Notes",
    body: "One-page references for every topic, plus your own notes and STAR stories in one place.",
    icon: ListChecks,
    href: "/cheatsheets",
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
            <div className="absolute left-1/2 top-0 h-[28rem] w-[46rem] -translate-x-1/2 bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--accent)_18%,transparent),transparent)]" />
            <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(var(--steel-800)_1px,transparent_1px),linear-gradient(90deg,var(--steel-800)_1px,transparent_1px)] [background-size:52px_52px] [mask-image:linear-gradient(to_bottom,black,transparent_78%)]" />
          </div>
          <div className="ia-content relative pt-14 pb-12 sm:pt-16 sm:pb-14 lg:pt-20 lg:pb-16">
            <div className="grid min-w-0 items-center gap-6 lg:grid-cols-[minmax(17rem,30rem)_minmax(0,1fr)] lg:gap-8">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[12px] font-medium text-accent shadow-xs">
                <span className="flex h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                <Zap className="h-3.5 w-3.5" aria-hidden />
                Forge Your Interview Skills
              </div>
              <h1 className="mt-4 text-[2.25rem] font-bold leading-[1.08] tracking-tight text-balance sm:text-[3.25rem] lg:text-[3.4rem]">
                Build skills.
                <br />
                Break limits.
                <br />
                <span className="bg-gradient-to-r from-accent via-amber-500 to-orange-500 bg-clip-text text-transparent">
                  Ace the interview.
                </span>
              </h1>
              <p className="mt-4 max-w-xl text-[15px] leading-7 text-muted-foreground">
                Everything you need to prepare for software engineering interviews — coding, system design, AI/ML,
                AI-powered mock interviews, and focused practice.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="gap-2 shadow-sm hover:shadow-md">
                  <Link href="/problems">
                    Start Practicing
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="bg-card/70 backdrop-blur-sm"
                >
                  <Link href="/learn">Explore Learning</Link>
                </Button>
              </div>
            </div>

            <HeroDesignFloat />
            </div>

            <div className="mt-8">
              <HeroPreview />
            </div>
          </div>
        </section>

        <section className="border-b border-steel-800 bg-steel-900/60">
          <div className="ia-content py-12 lg:py-14">
            <p className="text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">Features</p>
            <h2 className="mt-1.5 text-center text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl">
              Everything you need for the interview.
            </h2>
            <div className="mt-8 overflow-hidden rounded-2xl border border-steel-800 shadow-xs">
              <div className="grid gap-px bg-steel-800 sm:grid-cols-2">
                {FEATURES.map((item) => (
                  <Link
                    key={item.title}
                    href={item.href}
                    className="group flex cursor-pointer items-start gap-4 bg-steel-900 px-6 py-6 transition-all duration-200 hover:bg-steel-950/70"
                  >
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-accent/25 bg-accent/10 text-accent transition-all duration-200 group-hover:scale-105 group-hover:border-accent/40 group-hover:bg-accent/15 group-hover:shadow-[0_0_12px_rgba(249,115,22,0.15)]">
                      <item.icon className="h-5 w-5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold tracking-tight text-foreground transition-colors group-hover:text-accent">
                        {item.title}
                      </h3>
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
