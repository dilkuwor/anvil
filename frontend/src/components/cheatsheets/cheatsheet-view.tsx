"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { Breadcrumbs, PageHeader } from "@/components/layout/page-header";
import { ListenButton } from "@/components/tts/listen-button";
import { SectionCard } from "@/components/ui/section";
import { CardSkeleton, ErrorState } from "@/components/ui/state";
import { api } from "@/lib/api";
import {
  asStringList,
  asTable,
  type CheatSheetBlock,
  type CheatSheetDetail,
} from "@/lib/cheatsheets";
import { queryKeys } from "@/lib/queries";
import { cheatSheetSpeech } from "@/lib/tts";
import { cn } from "@/lib/utils";

export function CheatSheetView({ slug }: { slug: string }) {
  const sheet = useQuery({
    queryKey: queryKeys.cheatSheet(slug),
    queryFn: () => api.get<CheatSheetDetail>(`/api/v1/cheatsheets/${slug}`),
  });

  if (sheet.isLoading) return <CardSkeleton />;
  if (sheet.isError || !sheet.data) {
    return <ErrorState message="Unable to load this cheat sheet." onRetry={() => sheet.refetch()} />;
  }

  return <CheatSheetBody data={sheet.data} />;
}

function CheatSheetBody({ data }: { data: CheatSheetDetail }) {
  const [activeSlug, setActiveSlug] = useState(() => {
    if (typeof window === "undefined") return data.sections[0]?.slug ?? "";
    const hash = window.location.hash.replace(/^#/, "");
    return data.sections.some((section) => section.slug === hash) ? hash : (data.sections[0]?.slug ?? "");
  });

  useEffect(() => {
    const nodes = data.sections
      .map((section) => document.getElementById(section.slug))
      .filter((node): node is HTMLElement => Boolean(node));
    if (!nodes.length) return;

    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visible.set(entry.target.id, entry.boundingClientRect.top);
          } else {
            visible.delete(entry.target.id);
          }
        }
        if (!visible.size) return;
        const next = [...visible.entries()].sort((left, right) => Math.abs(left[1] - 96) - Math.abs(right[1] - 96))[0]?.[0];
        if (next) setActiveSlug(next);
      },
      { rootMargin: "-64px 0px -55% 0px", threshold: [0, 0.15, 0.35, 0.6, 1] },
    );
    for (const node of nodes) observer.observe(node);
    return () => observer.disconnect();
  }, [data.sections]);

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Breadcrumbs items={[{ href: "/cheatsheets", label: "Cheat Sheets" }, { label: data.title }]} />
        <PageHeader
          title={`${data.title} Cheat Sheet`}
          description={data.description}
          meta={
            <div className="flex flex-wrap items-center gap-2">
              <span>
                {data.section_count} sections · ~{data.estimated_minutes} min
              </span>
              <ListenButton text={cheatSheetSpeech(data)} />
            </div>
          }
        />
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[15rem_minmax(0,1fr)]">
        <nav
          aria-label="Sections"
          className="rounded-2xl border border-steel-800 bg-steel-900 p-4 xl:sticky xl:top-16"
        >
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">On this sheet</p>
          <ol className="mt-3 max-h-[70vh] space-y-0.5 overflow-y-auto text-[13px] leading-5">
            {data.sections.map((section, index) => {
              const active = section.slug === activeSlug;
              return (
                <li key={section.slug}>
                  <a
                    href={`#${section.slug}`}
                    aria-current={active ? "true" : undefined}
                    onClick={() => setActiveSlug(section.slug)}
                    className={cn(
                      "block rounded-md border-l-2 px-2 py-1",
                      active
                        ? "border-accent bg-accent/5 font-medium text-foreground"
                        : "border-transparent text-muted-foreground hover:text-accent",
                    )}
                  >
                    {index + 1}. {section.title}
                  </a>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="space-y-4">
          {data.sections.map((section) => (
            <SectionCard key={section.slug} id={section.slug} className="scroll-mt-16">
              <h2 className="text-[15px] font-semibold tracking-tight">{section.title}</h2>
              <div className="mt-4 space-y-4">
                {section.blocks.map((block, index) => (
                  <Block key={`${section.slug}-${index}`} block={block} />
                ))}
              </div>
            </SectionCard>
          ))}
        </div>
      </div>
    </div>
  );
}

function Block({ block }: { block: CheatSheetBlock }) {
  if (block.kind === "tip") {
    return (
      <div className="rounded-lg border border-accent/30 bg-accent/5 px-3 py-2.5">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-accent">Interview tip</p>
        <p className="mt-1 text-[13px] leading-6">{block.body}</p>
      </div>
    );
  }
  if (block.kind === "formula") {
    return (
      <div>
        <Label>{block.title || "Formula"}</Label>
        <pre className="mt-1 overflow-x-auto rounded-md border border-steel-800 bg-steel-950 px-3 py-2 font-mono text-[13px] leading-6">
          {block.body}
        </pre>
      </div>
    );
  }
  if (block.kind === "example") {
    return (
      <div>
        <Label>Example</Label>
        <p className="mt-1 font-mono text-[13px] leading-6 text-foreground/90">{block.body}</p>
      </div>
    );
  }
  if (block.kind === "bullets" || block.kind === "steps") {
    const items = asStringList(block.items);
    const List = block.kind === "steps" ? "ol" : "ul";
    return (
      <div>
        <Label>{block.title || (block.kind === "steps" ? "Steps" : "Remember")}</Label>
        <List className={cn("mt-1 space-y-1 pl-5 text-[13px] leading-6", block.kind === "steps" ? "list-decimal" : "list-disc")}>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </List>
      </div>
    );
  }
  if (block.kind === "table") {
    const table = asTable(block.items);
    if (!table) return null;
    return (
      <div>
        {block.title ? <Label>{block.title}</Label> : null}
        <div className="mt-1 overflow-x-auto rounded-lg border border-steel-800">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-steel-950/70 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              <tr>
                {table.headers.map((header) => (
                  <th key={header} className="px-3 py-2 font-medium">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row) => (
                <tr key={row.join("|")} className="border-t border-steel-800">
                  {row.map((cell, index) => (
                    <td key={`${cell}-${index}`} className="px-3 py-2 align-top leading-6">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
  return (
    <div>
      <Label>{block.title || (block.kind === "rule" ? "Key rule" : "Definition")}</Label>
      <p className="mt-1 text-[13px] leading-6">{block.body}</p>
    </div>
  );
}

function Label({ children }: { children: string }) {
  return <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{children}</p>;
}
