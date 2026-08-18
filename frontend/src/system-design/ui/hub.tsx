"use client";

import Link from "next/link";
import { Activity, Clock3, MessageSquare, Network, Play } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";

const CARDS = [
  {
    href: "/system-design/simulator",
    title: "Simulator",
    body: "Build an architecture, set a workload, and watch capacity, latency, and cost respond.",
    icon: Network,
  },
  {
    href: "/system-design/problems",
    title: "Problems",
    body: "Start from a concrete interview prompt with seeded traffic numbers.",
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
      <article className="flex flex-col gap-4 rounded-2xl border border-steel-800 bg-steel-900 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-accent">Featured Design</div>
          <h2 className="mt-1 text-sm font-semibold tracking-tight">URL Shortener</h2>
          <p className="mt-1 max-w-xl text-[13px] leading-6 text-muted-foreground">
            A wired architecture you can simulate immediately: DNS, rate limit, load balancer, API, Redis, Postgres, and
            Kafka for click events. Change a box, hit Simulate again.
          </p>
        </div>
        <Button asChild>
          <Link href="/system-design/simulator?sample=url-shortener">
            <Play className="h-3.5 w-3.5" />
            Load & simulate
          </Link>
        </Button>
      </article>
      <div className="grid gap-3 sm:grid-cols-2">
        {CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="flex items-start gap-3 rounded-2xl border border-steel-800 bg-steel-900 p-5 hover:border-accent/40"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-accent/20 bg-accent/10 text-accent">
              <card.icon className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-sm font-semibold tracking-tight">{card.title}</h2>
              <p className="mt-1 text-[13px] leading-6 text-muted-foreground">{card.body}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
