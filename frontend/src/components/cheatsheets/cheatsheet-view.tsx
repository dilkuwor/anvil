"use client";

import { useQuery } from "@tanstack/react-query";

import { Breadcrumbs, PageHeader } from "@/components/layout/page-header";
import { SectionCard } from "@/components/ui/section";
import { CardSkeleton, ErrorState } from "@/components/ui/state";
import { api } from "@/lib/api";
import { asStringList, asTable, type CheatSheetBlock, type CheatSheetDetail } from "@/lib/cheatsheets";
import { queryKeys } from "@/lib/queries";
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

  const data = sheet.data;

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Breadcrumbs items={[{ href: "/cheatsheets", label: "Cheat Sheets" }, { label: data.title }]} />
        <PageHeader
          title={`${data.title} Cheat Sheet`}
          description={data.description}
          meta={`${data.section_count} sections · ~${data.estimated_minutes} min`}
        />
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[15rem_minmax(0,1fr)]">
        <nav
          aria-label="Sections"
          className="xl:sticky xl:top-16 rounded-2xl border border-steel-800 bg-steel-900 p-4"
        >
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">On this sheet</p>
          <ol className="mt-3 space-y-1.5 text-[13px] leading-5">
            {data.sections.map((section, index) => (
              <li key={section.slug}>
                <a href={`#${section.slug}`} className="text-muted-foreground hover:text-accent">
                  {index + 1}. {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="space-y-4">
          {data.sections.map((section) => (
            <SectionCard key={section.slug} className="scroll-mt-20">
              <div id={section.slug} className="scroll-mt-20">
                <h2 className="text-[15px] font-semibold tracking-tight">{section.title}</h2>
                <div className="mt-4 space-y-4">
                  {section.blocks.map((block, index) => (
                    <Block key={`${section.slug}-${index}`} block={block} />
                  ))}
                </div>
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
