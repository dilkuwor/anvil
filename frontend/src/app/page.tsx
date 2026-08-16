import Link from "next/link";
import { Binary, MessageSquare, Network, Sparkles } from "lucide-react";

import { HeroPreview } from "@/components/landing/hero-preview";
import { PublicHeader } from "@/components/layout/public-header";
import { BrandMark } from "@/components/ui/section";
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
    href: "/learn/system-design",
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
  { n: "01", title: "Solve", body: "Practice realistic interview problems." },
  { n: "02", title: "Learn", body: "Understand the concepts and patterns behind them." },
  { n: "03", title: "Interview", body: "Practice explaining your thinking through mock interviews." },
  { n: "04", title: "Improve", body: "Use feedback and cheat sheets to target weak areas." },
];

const FOOTER_NAV = [
  { href: "/problems", label: "Problems" },
  { href: "/roadmap", label: "Roadmap" },
  { href: "/learn", label: "Learn" },
  { href: "/cheatsheets", label: "Cheat Sheets" },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen w-full max-w-[100vw] flex-col overflow-x-clip">
      <PublicHeader />
      <main>
        <section className="relative overflow-hidden border-b border-steel-800">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-0 h-[28rem] w-[46rem] -translate-x-1/2 bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--accent)_16%,transparent),transparent)]" />
            <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(var(--steel-800)_1px,transparent_1px),linear-gradient(90deg,var(--steel-800)_1px,transparent_1px)] [background-size:52px_52px] [mask-image:linear-gradient(to_bottom,black,transparent_78%)]" />
          </div>

          <div className="ia-content relative py-16 sm:py-20 lg:py-24">
            <div className="max-w-2xl">
              <h1 className="text-[2rem] font-semibold leading-[1.1] tracking-tight sm:text-5xl lg:text-[3.25rem] lg:leading-[1.06]">
                Practice coding.
                <br className="hidden sm:block" /> Master the interview.
              </h1>
              <p className="mt-5 max-w-xl text-[15px] leading-7 text-muted-foreground">
                Everything you need to prepare for software engineering interviews — coding problems, system design,
                AI/ML, mock interviews, and focused interview review.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button asChild size="lg">
                  <Link href="/problems">Start Practicing</Link>
                </Button>
                <Button asChild size="lg" variant="secondary">
                  <Link href="/learn">Explore Learn</Link>
                </Button>
                <Button asChild size="lg" variant="ghost" className="max-sm:hidden">
                  <Link href="/login">Log in</Link>
                </Button>
              </div>
            </div>

            <div className="mt-12 lg:mt-16">
              <HeroPreview />
            </div>
          </div>
        </section>

        <section>
          <div className="ia-content py-16 lg:py-20">
            <h2 className="text-[1.35rem] font-semibold tracking-tight">Everything you need for the interview.</h2>
            <div className="mt-8 overflow-hidden rounded-2xl border border-steel-800">
              <div className="grid gap-px bg-steel-800 sm:grid-cols-2">
                {FEATURES.map((item) => (
                  <Link
                    key={item.title}
                    href={item.href}
                    className="group flex flex-col bg-steel-900 p-6 transition-colors hover:bg-steel-950/40 sm:p-7"
                  >
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-steel-800 bg-steel-950/50 text-accent transition-colors group-hover:border-accent/30 group-hover:bg-accent/10">
                      <item.icon className="h-4 w-4" aria-hidden />
                    </span>
                    <h3 className="mt-5 text-sm font-semibold tracking-tight">{item.title}</h3>
                    <p className="mt-1.5 max-w-sm text-[13px] leading-6 text-muted-foreground">{item.body}</p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-steel-800">
          <div className="ia-content py-16 lg:py-20">
            <h2 className="text-[1.35rem] font-semibold tracking-tight">Practice with a purpose.</h2>
            <ol className="mt-10 grid gap-8 sm:grid-cols-2 xl:grid-cols-4">
              {STEPS.map((step, index) => (
                <li key={step.n}>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full border border-accent/25 bg-accent/10 text-[11px] font-medium tabular-nums tracking-[0.08em] text-accent">
                      {step.n}
                    </span>
                    {index < STEPS.length - 1 ? <span aria-hidden className="hidden h-px flex-1 bg-steel-800 xl:block" /> : null}
                  </div>
                  <h3 className="mt-4 text-sm font-semibold tracking-tight">{step.title}</h3>
                  <p className="mt-1.5 max-w-xs text-[13px] leading-6 text-muted-foreground">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-t border-steel-800">
          <div className="ia-content py-16 lg:py-20">
            <div className="rounded-2xl border border-steel-800 bg-steel-900 px-6 py-8 sm:px-8 sm:py-10 lg:flex lg:items-start lg:justify-between lg:gap-16 lg:px-10">
              <h2 className="max-w-xs text-[1.35rem] font-semibold tracking-tight">Built for real interview preparation.</h2>
              <div className="mt-4 max-w-xl lg:mt-0">
                <p className="text-[15px] leading-7 text-muted-foreground">
                  InterviewAnvil combines problem solving, technical learning, system design, AI/ML preparation, and mock
                  interviews into one focused preparation workflow.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button asChild>
                    <Link href="/problems">Start Practicing</Link>
                  </Button>
                  <Button asChild variant="secondary">
                    <Link href="/learn">Explore Learn</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="mt-auto border-t border-steel-800">
        <div className="ia-content flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
          <Link href="/" className="text-sm">
            <BrandMark compact />
          </Link>
          <nav className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-[13px] text-muted-foreground" aria-label="Footer">
            {FOOTER_NAV.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-foreground">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}
