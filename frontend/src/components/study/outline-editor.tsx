"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { SectionCard, SectionTitle } from "@/components/ui/section";
import { CardSkeleton, ErrorState } from "@/components/ui/state";
import { ApiError } from "@/lib/api";
import { useOutline, useSaveOutline, type DesignOutline } from "@/lib/study";

const TEMPLATE = `1. Requirements:
2. Data and storage:
3. Main flow:
4. Scaling:
5. Trade-offs: `;

export function OutlineEditor({ slug }: { slug: string }) {
  const outline = useOutline(slug);
  if (outline.isLoading) {
    return (
      <main className="ia-content py-6">
        <div className="mx-auto max-w-3xl">
          <CardSkeleton rows={6} />
        </div>
      </main>
    );
  }
  if (outline.isError || !outline.data) {
    const message = outline.error instanceof ApiError ? outline.error.message : "Unable to load this question.";
    return (
      <main className="ia-content py-6">
        <div className="mx-auto max-w-3xl">
          <ErrorState message={message} onRetry={() => outline.refetch()} />
        </div>
      </main>
    );
  }
  return <Editor key={outline.data.note_id ?? "new"} data={outline.data} />;
}

function Editor({ data }: { data: DesignOutline }) {
  const save = useSaveOutline(data.slug);
  const [text, setText] = useState(data.outline || TEMPLATE);

  function submit(done?: boolean) {
    save.mutate(
      { outline: text, ...(done === undefined ? {} : { done }) },
      {
        onSuccess: () => toast.success(done ? "Outline saved and marked done." : "Outline saved."),
        onError: (error) => toast.error(error instanceof ApiError ? error.message : "Unable to save."),
      },
    );
  }

  return (
    <main className="ia-content py-6">
      <div className="mx-auto max-w-3xl space-y-5">
        <Link href="/today" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to Today
        </Link>
        <PageHeader
          title={data.title}
          description="Write the outline in five short lines. It is saved as a note and becomes your review card."
        />

        <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          <SectionCard className="space-y-4">
            <SectionTitle>The question</SectionTitle>
            <p className="text-[14px] leading-relaxed text-foreground">{data.prompt}</p>
            <List title="Must do" items={data.functional_requirements} />
            <List title="Must be" items={data.non_functional_requirements} />
            <List title="Numbers" items={data.constraints} />
          </SectionCard>

          <SectionCard className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <SectionTitle>Your outline</SectionTitle>
              {data.done ? <span className="text-[12px] font-medium text-teal">Done</span> : null}
            </div>
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={14}
              aria-label="Outline"
              className="min-h-[320px] w-full flex-1 resize-y rounded-lg border border-steel-700/80 bg-steel-950/40 px-3 py-2 font-mono text-[13.5px] leading-relaxed text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={() => submit()} disabled={save.isPending}>
                Save
              </Button>
              {data.done ? (
                <Button type="button" variant="ghost" onClick={() => submit(false)} disabled={save.isPending}>
                  Mark not done
                </Button>
              ) : (
                <Button type="button" onClick={() => submit(true)} disabled={save.isPending || !text.trim()}>
                  Save and mark done
                </Button>
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </main>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{title}</p>
      <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[13.5px] leading-relaxed text-foreground">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
