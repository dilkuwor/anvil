"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { deleteDesign, listDesigns, listResults, saveCurrent } from "../state/persist";
import { formatMs, formatRps, formatUsd } from "../utils/format";

export function HistoryPage() {
  const router = useRouter();
  const [designs, setDesigns] = useState(() => listDesigns());

  return (
    <div className="space-y-6">
      <PageHeader title="Architecture History" description="Locally saved designs and their most recent simulation." />
      {!designs.length ? (
        <p className="text-sm text-muted-foreground">Nothing saved yet. Run the simulator and hit Save.</p>
      ) : (
        <div className="space-y-3">
          {designs.map((item) => {
            const latest = listResults(item.id)[0];
            return (
              <article key={item.id} className="rounded-2xl border border-steel-800 bg-steel-900 px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold">{item.name}</h2>
                    <p className="mt-1 text-[12px] text-muted-foreground">
                      {item.nodes.length} components · updated {new Date(item.updatedAt).toLocaleString()}
                    </p>
                    {latest ? (
                      <p className="mt-2 text-[12px] text-muted-foreground">
                        Last run {formatRps(latest.throughput.processedRps)} rps · p95 {formatMs(latest.latency.p95)} ·{" "}
                        {formatUsd(latest.cost.total)}/mo
                      </p>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        saveCurrent(item);
                        router.push(`/system-design/simulator?id=${item.id}`);
                      }}
                    >
                      Open
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        deleteDesign(item.id);
                        setDesigns(listDesigns());
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
      <Link href="/system-design" className="text-[13px] text-muted-foreground hover:text-accent">
        ← System Design
      </Link>
    </div>
  );
}
