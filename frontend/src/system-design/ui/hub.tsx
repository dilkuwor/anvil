"use client";

import Link from "next/link";
import { Activity, Clock3, MessageSquare, Network, Play } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";

const CARDS = [
  {
    href: "/system-design/simulator",
    title: "Simulator",
    body: "Build an architecture, run the estimation worksheet, and get an interviewer-style review with bottlenecks and fixes.",
    icon: Network,
  },
  {
    href: "/system-design/problems",
    title: "Problems",
    body: "The same catalog as Learn and Mock Interview — open a prompt in the simulator.",
    icon: Activity,
  },
  {
    href: "/system-design/interview",
    title: "Mock Interview",
    body: "Talk through a scenario with the adaptive interviewer and a live canvas.",
    icon: MessageSquare,
  },
  {
    href: "/system-design/history",
    title: "History",
    body: "Reopen saved designs and compare the last simulation runs.",
    icon: Clock3,
  },
];

export function SystemDesignHub() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="System Design"
        description="Simulate architectures like an engineer: traffic, capacity, latency, storage, and cost — then iterate."
      />
      <article className="relative overflow-hidden flex flex-col gap-5 rounded-2xl border border-accent/30 bg-gradient-to-r from-steel-900 via-steel-900 to-accent/10 p-6 shadow-md sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/15 px-3 py-0.5 text-[11px] font-bold text-accent shadow-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
            Featured Architecture
          </div>
          <h2 className="mt-2.5 text-lg font-bold tracking-tight text-foreground">URL Shortener</h2>
          <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-muted-foreground">
            A wired architecture you can simulate immediately: DNS, rate limit, load balancer, API, Redis, Postgres, and
            Kafka for click events. Change a box, hit Simulate again.
          </p>
        </div>
        <Button asChild size="lg" className="gap-2 shadow-sm shrink-0">
          <Link href="/system-design/simulator?sample=url-shortener">
            <Play className="h-4 w-4 fill-current" />
            Load & Simulate
          </Link>
        </Button>
      </article>
      <div className="grid gap-4 sm:grid-cols-2">
        {CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group flex items-start gap-4 rounded-2xl border border-steel-800/90 bg-steel-900/90 p-5 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:bg-steel-900 hover:shadow-md"
          >
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-accent/25 bg-accent/10 text-accent transition-all duration-200 group-hover:scale-105 group-hover:border-accent/40 group-hover:bg-accent/15 group-hover:shadow-[0_0_12px_rgba(249,115,22,0.15)]">
              <card.icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-bold tracking-tight text-foreground transition-colors group-hover:text-accent">
                {card.title}
              </h2>
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{card.body}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
