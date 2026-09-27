import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Brain,
  CalendarCheck,
  CircleDot,
  Code2,
  Headphones,
  MessageSquare,
  Network,
  Route,
  Sparkles,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PublicHeader } from "@/components/layout/public-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { PageHeader } from "@/components/layout/page-header";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "About",
  description:
    "Anvil helps software engineers prepare for technical interviews with lessons that check your understanding, spaced review that brings ideas back before you forget them, and realistic practice.",
  path: "/about",
});

const LOOP: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: BookOpen,
    title: "Learn",
    body: "Short lessons across data structures, system design, Java, CS fundamentals, object-oriented design, behavioral interviews, and AI. Each one has a mental model, worked examples, trade-offs, and the mistakes interviewers look for.",
  },
  {
    icon: CircleDot,
    title: "Check yourself",
    body: "A lesson ends with a few questions on every part of it. Answer them all correctly once and the lesson marks itself as checked. No score, no pass or fail, and a miss simply comes back at the end of the round with an explanation.",
  },
  {
    icon: Brain,
    title: "Remember",
    body: "The questions you answered return in short review sessions, timed by a memory model that predicts when you are about to forget. Recall them a few times over the weeks and the lesson counts as mastered.",
  },
  {
    icon: Code2,
    title: "Practice",
    body: "Coding problems run in a sandbox against hidden tests, with hints and reference solutions. System design questions have a simulator that shows how a design behaves under load and failure.",
  },
  {
    icon: MessageSquare,
    title: "Interview",
    body: "Mock coding, system design, and behavioral interviews with an AI interviewer that asks follow-ups the way a real one would, then gives feedback you can act on.",
  },
  {
    icon: CalendarCheck,
    title: "Today",
    body: "One plan per day: what is due for review, the next lesson, the next problem. A study path pairs coding topics with design questions and spreads them over the weeks you have before your interview.",
  },
];

const PRINCIPLES: { title: string; body: string }[] = [
  {
    title: "Retrieval over rereading",
    body: "Reading a lesson feels like learning, but recalling it is what makes it stay. Anvil is built so that every lesson is something you answer, not only something you read.",
  },
  {
    title: "Spacing, not cramming",
    body: "Ideas come back on a schedule that stretches as you get them right. The same review effort covers far more material than rereading ever could.",
  },
  {
    title: "Calm by design",
    body: "No streak pressure, no guilt messages, no locked content. The daily goal is a small ring to fill, and a missed day moves the plan later on its own.",
  },
  {
    title: "Nothing decorative",
    body: "Visualizations are step-through pictures of the actual mechanism, one change at a time. The reader turns lessons into audio you can follow with the text highlighted, for days when reading is hard.",
  },
];

const ALSO: { icon: LucideIcon; label: string; href: string }[] = [
  { icon: Route, label: "Study path", href: "/path" },
  { icon: Network, label: "Visualizations", href: "/visualizations" },
  { icon: Headphones, label: "Lessons with audio", href: "/learn" },
  { icon: Sparkles, label: "Ask AI on any lesson", href: "/learn" },
];

export default function AboutPage() {
  return (
    <div className="flex min-h-screen w-full max-w-[100vw] flex-col overflow-x-clip">
      <PublicHeader />
      <main className="ia-content max-w-5xl flex-1 py-10 sm:py-14">
        <PageHeader
          title="About Anvil"
          description="Interview preparation built around how people actually remember things."
        />
        <p className="mt-5 max-w-2xl text-[15px] leading-7 text-muted-foreground">
          Anvil is a ByteTech LLC product for software engineers preparing for technical interviews. It teaches the
          concepts, checks that you understood them, brings them back before you forget, and gives you realistic places
          to apply them: a coding sandbox, a system design simulator, and mock interviews.
        </p>

        <section className="mt-10">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">The loop</h2>
          <p className="mt-1 text-[13.5px] text-muted-foreground">Learn, check, remember, practice, interview. Today ties it together.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {LOOP.map((step) => (
              <div key={step.title} className="rounded-xl border border-steel-800 bg-steel-900 p-4">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-accent/20 bg-accent/10 text-accent">
                    <step.icon className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
                  </span>
                  <h3 className="text-[14px] font-semibold text-foreground">{step.title}</h3>
                </div>
                <p className="mt-2 text-[13px] leading-6 text-muted-foreground">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">What we believe</h2>
          <div className="mt-4 grid gap-x-8 gap-y-5 sm:grid-cols-2">
            {PRINCIPLES.map((item) => (
              <div key={item.title}>
                <h3 className="text-[14px] font-semibold text-foreground">{item.title}</h3>
                <p className="mt-1 text-[13px] leading-6 text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Also inside</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {ALSO.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="inline-flex items-center gap-1.5 rounded-full border border-steel-800 bg-steel-900 px-3 py-1.5 text-[13px] font-medium text-foreground transition-colors hover:border-accent/40 hover:text-accent"
              >
                <item.icon className="h-3.5 w-3.5 text-accent" aria-hidden />
                {item.label}
              </Link>
            ))}
          </div>
        </section>

        <p className="mt-10 max-w-2xl text-[13.5px] leading-6 text-muted-foreground">
          How we handle information is described in the{" "}
          <Link className="font-medium text-foreground hover:text-accent" href="/privacy">
            Privacy Policy
          </Link>
          . Using the product is subject to the{" "}
          <Link className="font-medium text-foreground hover:text-accent" href="/terms">
            Terms of Service
          </Link>
          .
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
