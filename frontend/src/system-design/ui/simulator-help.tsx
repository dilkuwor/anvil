"use client";

import { CircleHelp, Play, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { kindsByCategory } from "../components/registry";
import { KindIcon } from "./icons";
import { cn } from "@/lib/utils";

const TOOLBAR = [
  { label: "Level", body: "How many knobs the Inspector shows. Beginner keeps the basics; Expert reveals failure rates, compression, and manual caps." },
  { label: "Sample", body: "Loads the URL Shortener architecture so you can simulate immediately." },
  { label: "Reset", body: "Starts a blank design. The current graph is pushed onto undo." },
  { label: "Save", body: "Stores this architecture in the browser. Shortcut: ⌘S / Ctrl+S." },
  { label: "Simulate", body: "Runs the capacity, latency, storage, and cost model on the current graph and workload." },
];

type Term = { label: string; body: string };
type TabGroup = { title: string; intro?: string; sections: { heading?: string; items: Term[] }[] };

const TAB_GROUPS: TabGroup[] = [
  {
    title: "Workload",
    intro: "Size the traffic the graph is tested against, then set SLO budgets.",
    sections: [
      {
        heading: "Inputs",
        items: [
          { label: "DAU", body: "Daily active users. Combined with requests per user to size average traffic." },
          { label: "Req / user / day", body: "How many requests one user makes in a day." },
          { label: "Read ratio", body: "Share of peak traffic that is reads (0–1). The rest is writes." },
          { label: "Peak multiplier", body: "Peak RPS = average RPS × this. Typical interview range is 3–5×." },
          { label: "Request bytes", body: "Average request size. Feeds bandwidth and cost." },
          { label: "Response bytes", body: "Average response size. Feeds egress and storage growth." },
        ],
      },
      {
        heading: "Derived",
        items: [
          { label: "Daily requests", body: "DAU × requests per user." },
          { label: "Avg RPS", body: "Daily requests ÷ 86,400." },
          { label: "Peak RPS", body: "The traffic the graph is simulated against." },
          { label: "Read / write", body: "Peak RPS split by the read ratio. Caches, replicas, and queues use this split." },
        ],
      },
      {
        heading: "SLOs",
        items: [
          { label: "p95 ms", body: "95% of requests should finish under this latency." },
          { label: "p99 ms", body: "The tail-latency budget." },
          { label: "Error rate", body: "Dropped + rejected traffic as a fraction of peak RPS." },
          { label: "Availability", body: "1 − error rate. Compared to the SLO after each run." },
        ],
      },
    ],
  },
  {
    title: "Metrics",
    intro: "Headline result of the last Simulate. Empty until you run one.",
    sections: [
      {
        items: [
          { label: "Throughput", body: "Requests the graph actually processed at peak, after drops and rejects." },
          { label: "p50 / p95 / p99", body: "End-to-end latency along the critical path." },
          { label: "Errors", body: "Share of peak traffic lost to capacity, rate limits, or failures." },
          { label: "Availability", body: "Share of peak traffic that made it through." },
          { label: "PASS / FAIL", body: "Each SLO compared to the last run." },
          { label: "vs last run", body: "Delta in RPS, p95, and monthly cost versus the previous Simulate." },
          { label: "Primary bottleneck", body: "Banner above the canvas: the hottest node and why." },
        ],
      },
    ],
  },
  {
    title: "Capacity",
    intro: "One card per component after a run.",
    sections: [
      {
        items: [
          { label: "Processed RPS", body: "What that node actually handled." },
          { label: "Health", body: "healthy < 70%, warning ≥ 70%, critical ≥ 85%, overloaded ≥ 100%." },
          { label: "rps", body: "Utilization of request capacity." },
          { label: "cpu", body: "Compute pressure on API servers and databases." },
          { label: "memory", body: "RAM pressure on caches and app tiers." },
          { label: "connections", body: "Connection-pool pressure on databases." },
          { label: "iops", body: "Disk operations on databases." },
          { label: "produce / consume", body: "Kafka producer vs consumer capacity." },
          { label: "partitions", body: "Consumers relative to Kafka partitions." },
          { label: "read / write", body: "Split utilization on stores and object storage." },
          { label: "In / Out", body: "Inspector: incoming RPS vs processed RPS for the selected node." },
        ],
      },
    ],
  },
  {
    title: "Latency",
    intro: "The slowest chain of hops at p95.",
    sections: [
      {
        items: [
          { label: "Critical path", body: "Users → … → sink along the path with the highest summed p95." },
          { label: "Hop p95", body: "That component’s 95th-percentile processing time, including queueing as it saturates." },
        ],
      },
    ],
  },
  {
    title: "Storage",
    intro: "Growth math for databases and object stores.",
    sections: [
      {
        items: [
          { label: "Compressed", body: "Payload after the compression factor — the headline size." },
          { label: "Raw", body: "Uncompressed payload volume." },
          { label: "Indexes", body: "Extra bytes from the index-overhead ratio." },
          { label: "Replicas", body: "Copies from the replication factor." },
          { label: "Backups", body: "Extra bytes from the backup-overhead ratio." },
        ],
      },
    ],
  },
  {
    title: "Cost",
    intro: "Interview-style monthly $, not a cloud bill.",
    sections: [
      {
        items: [
          { label: "Cost lines", body: "One row per component class (compute, cache, databases, queues, storage)." },
          { label: "Total / month", body: "Sum of the lines. Order-of-magnitude only." },
        ],
      },
    ],
  },
  {
    title: "Failures",
    intro: "Toggle one or more, then Simulate again. They mutate capacity or latency for that run only.",
    sections: [
      {
        items: [
          { label: "Traffic spike 5×", body: "Multiplies the peak multiplier by 5." },
          { label: "Kill half the APIs", body: "Cuts API instances in half and raises their failure rate." },
          { label: "Database impaired", body: "Collapses read/write capacity on Postgres, MySQL, and NoSQL." },
          { label: "Cache down", body: "Redis stops absorbing hits; traffic falls through." },
          { label: "Kafka impaired", body: "Producer and consumer throughput collapse." },
          { label: "+80ms network", body: "Adds 80ms to component base latency." },
        ],
      },
    ],
  },
];

const SHORTCUTS = [
  { label: "⌘S / Ctrl+S", body: "Save locally." },
  { label: "⌘Z / Ctrl+Z", body: "Undo the last graph change." },
  { label: "⌘D / Ctrl+D", body: "Duplicate the selected component." },
  { label: "Delete / Backspace", body: "Remove selected nodes or edges." },
  { label: "Right-click a node", body: "Duplicate, disable, or delete." },
];

export function SimulatorHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      setVisible(true);
      const frame = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setEntered(true));
      });
      return () => window.cancelAnimationFrame(frame);
    }
    setEntered(false);
    const timeout = window.setTimeout(() => setVisible(false), 300);
    return () => window.clearTimeout(timeout);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!mounted || !visible) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60]">
      <div
        className={cn(
          "absolute inset-0 bg-background/70 backdrop-blur-sm transition-opacity duration-300",
          entered ? "opacity-100" : "opacity-0",
        )}
        aria-hidden
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "absolute inset-y-0 right-0 flex w-full flex-col border-l border-steel-800 bg-steel-900 shadow-2xl transition-transform duration-300 ease-out md:w-1/2",
          entered ? "translate-x-0" : "translate-x-full",
        )}
      >
        <header className="flex items-start justify-between gap-3 border-b border-steel-800 px-5 py-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="min-w-0">
            <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Simulator</div>
            <h2 id={titleId} className="mt-1 text-base font-semibold tracking-tight">
              How this workspace works
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground"
            aria-label="Close help"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-8 overflow-y-auto overscroll-contain px-5 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <HelpSection title="Using it">
            <ol className="list-decimal space-y-1.5 pl-4 text-[13px] leading-6 text-muted-foreground">
              <li>
                Drag components from the left palette onto the canvas. Traffic enters at{" "}
                <span className="text-foreground">Users / Client</span>.
              </li>
              <li>Connect handles left → right in request-path order (users to edge to app to data).</li>
              <li>Select a box to rename it and edit capacity in the Inspector.</li>
              <li>Set DAU, peak, and SLOs in the bottom Workload tab, then click Simulate.</li>
              <li>Editing the graph clears the last run — simulate again after each change.</li>
            </ol>
            <p className="text-[13px] leading-6 text-muted-foreground">
              Results are interview-style estimates (queueing, hit ratios, safety factors), not a cloud bill or packet capture.
            </p>
          </HelpSection>

          <HelpSection title="Toolbar">
            <TermList items={TOOLBAR} />
          </HelpSection>

          <HelpSection title="Components">
            <p className="text-[13px] leading-6 text-muted-foreground">
              Every box is a capacity model. Disabled nodes drop all incoming traffic and stay out of the path.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {kindsByCategory().map((group) => (
                <div key={group.category}>
                  <h4 className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{group.label}</h4>
                  <ul className="mt-2 space-y-2">
                    {group.items.map((item) => (
                      <li key={item.type} className="flex items-start gap-2.5">
                        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-steel-800 text-accent">
                          <KindIcon name={item.icon} className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0">
                          <div className="text-[13px] font-medium leading-5">{item.label}</div>
                          <p className="mt-0.5 text-[12px] leading-5 text-muted-foreground">{item.description}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </HelpSection>

          <HelpSection title="Canvas labels">
            <TermList
              items={[
                { label: "Name", body: "Editable label. The smaller uppercase line is the component type." },
                { label: "RPS", body: "After Simulate, each node shows processed RPS. Edges show the flow between them." },
                { label: "Lost", body: "Appears when a node drops or rejects more than ~1 RPS." },
                { label: "Selection", body: "Accent border on the selected box. Dashed + faded means disabled." },
              ]}
            />
            <div>
              <div className="text-[13px] font-medium">Health border</div>
              <ul className="mt-2 space-y-1.5 text-[12px] leading-5 text-muted-foreground">
                <HealthRow tone="border-steel-800" label="Healthy" body="Peak utilization under 70%." />
                <HealthRow tone="border-accent" label="Warning" body="70–85%. Getting tight." />
                <HealthRow tone="border-coral" label="Critical" body="85–100%. Likely your bottleneck." />
                <HealthRow tone="border-coral bg-coral/10" label="Overloaded" body="At or over capacity; traffic is lost." />
              </ul>
            </div>
          </HelpSection>

          <HelpSection title="Bottom panel">
            <p className="text-[13px] leading-6 text-muted-foreground">
              Labels below match the tabs under the canvas. Run Simulate to fill Metrics through Cost.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {TAB_GROUPS.map((group) => (
                <article
                  key={group.title}
                  className={cn(
                    "rounded-xl border border-steel-800 bg-background/30 p-4",
                    group.sections.length > 1 && "sm:col-span-2",
                  )}
                >
                  <h4 className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{group.title}</h4>
                  {group.intro ? <p className="mt-2 text-[12px] leading-5 text-muted-foreground">{group.intro}</p> : null}
                  <div
                    className={cn(
                      "mt-3 space-y-3",
                      group.sections.length > 1 && "sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0",
                    )}
                  >
                    {group.sections.map((section) => (
                      <div key={section.heading ?? group.title}>
                        {section.heading ? (
                          <h5 className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                            {section.heading}
                          </h5>
                        ) : null}
                        <TermList items={section.items} />
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </HelpSection>

          <HelpSection title="Play">
            <div className="rounded-xl border border-steel-800 bg-background/40 p-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-steel-800 bg-steel-900 text-accent">
                  <Play className="h-3.5 w-3.5" fill="currentColor" aria-hidden />
                </span>
                <div>
                  <div className="text-[13px] font-medium">Play</div>
                  <p className="text-[12px] leading-5 text-muted-foreground">Shows in the results bar after a successful Simulate.</p>
                </div>
              </div>
              <ul className="mt-3 space-y-2 text-[13px] leading-6 text-muted-foreground">
                <li>
                  <span className="font-medium text-foreground">Play / Pause</span> walks a peak-hour ramp of the last run. The
                  timeline slider moves from idle (0) to peak (1) and loops.
                </li>
                <li>
                  <span className="font-medium text-foreground">1× 2× 5× 10×</span> is playback speed. Faster multipliers skip
                  through the ramp.
                </li>
                <li>
                  <span className="font-medium text-foreground">Timeline slider</span> jumps to any point. Nodes still show the
                  full-run numbers; Play is a scrubber, not a packet animation.
                </li>
                <li>
                  <span className="font-medium text-foreground">Pause</span> freezes the cursor so you can inspect a moment in
                  the ramp.
                </li>
              </ul>
            </div>
          </HelpSection>

          <HelpSection title="Shortcuts">
            <TermList items={SHORTCUTS} />
          </HelpSection>
        </div>
      </aside>
    </div>,
    document.body,
  );
}

export function SimulatorHelpButton({ onClick, expanded }: { onClick: () => void; expanded?: boolean }) {
  return (
    <button
      type="button"
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-steel-800 hover:text-foreground"
      aria-label="Open simulator help"
      aria-haspopup="dialog"
      aria-expanded={expanded}
      title="How the simulator works"
      onClick={onClick}
    >
      <CircleHelp className="h-4 w-4" />
    </button>
  );
}

function HelpSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

function TermList({ items }: { items: { label: string; body: string }[] }) {
  return (
    <dl className="space-y-2.5">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-[13px] font-medium leading-5">{item.label}</dt>
          <dd className="mt-0.5 text-[12px] leading-5 text-muted-foreground">{item.body}</dd>
        </div>
      ))}
    </dl>
  );
}

function HealthRow({ tone, label, body }: { tone: string; label: string; body: string }) {
  return (
    <li className="flex items-start gap-2">
      <span className={cn("mt-0.5 h-4 w-7 shrink-0 rounded border", tone)} aria-hidden />
      <span>
        <span className="font-medium text-foreground">{label}.</span> {body}
      </span>
    </li>
  );
}
