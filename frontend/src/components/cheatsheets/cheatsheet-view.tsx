"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  BookOpen,
  Clock,
  FileText,
  ListOrdered,
  Maximize2,
  Minimize2,
  Printer,
  Search,
  Share2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { CheatSheetBlockRenderer } from "@/components/cheatsheets/cheatsheet-blocks";
import { Breadcrumbs } from "@/components/layout/page-header";
import { NotesPanel } from "@/components/notes/notes-drawer";
import { ListenButton } from "@/components/tts/listen-button";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section";
import { CardSkeleton, ErrorState } from "@/components/ui/state";
import { api } from "@/lib/api";
import type { CheatSheetCard, CheatSheetDetail } from "@/lib/cheatsheets";
import { queryKeys } from "@/lib/queries";
import { cheatSheetSpeech } from "@/lib/tts";
import { cn } from "@/lib/utils";

export function CheatSheetView({ slug }: { slug: string }) {
  const sheet = useQuery({
    queryKey: queryKeys.cheatSheet(slug),
    queryFn: () => api.get<CheatSheetDetail>(`/api/v1/cheatsheets/${slug}`),
  });

  const allSheets = useQuery({
    queryKey: queryKeys.cheatSheets,
    queryFn: () => api.get<CheatSheetCard[]>("/api/v1/cheatsheets"),
  });

  if (sheet.isLoading) return <CardSkeleton rows={8} />;
  if (sheet.isError || !sheet.data) {
    return <ErrorState message="Unable to load this cheat sheet." onRetry={() => sheet.refetch()} />;
  }

  return <CheatSheetBody data={sheet.data} allSheets={allSheets.data ?? []} />;
}

function CheatSheetBody({
  data,
  allSheets,
}: {
  data: CheatSheetDetail;
  allSheets: CheatSheetCard[];
}) {
  const router = useRouter();
  const [compact, setCompact] = useState(false);
  const [sectionFilter, setSectionFilter] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);

  const [activeSlug, setActiveSlug] = useState(() => {
    if (typeof window === "undefined") return data.sections[0]?.slug ?? "";
    const hash = window.location.hash.replace(/^#/, "");
    return data.sections.some((section) => section.slug === hash) ? hash : (data.sections[0]?.slug ?? "");
  });

  // Track scroll position for active section and reading progress
  useEffect(() => {
    function updateProgress() {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      if (docHeight <= 0) {
        setReadingProgress(100);
        return;
      }
      const percent = Math.min(100, Math.max(0, (scrollTop / docHeight) * 100));
      setReadingProgress(percent);
    }
    window.addEventListener("scroll", updateProgress, { passive: true });
    updateProgress();
    return () => window.removeEventListener("scroll", updateProgress);
  }, []);

  // IntersectionObserver for scrollspy
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

  const filteredSections = useMemo(() => {
    if (!sectionFilter.trim()) return data.sections;
    const q = sectionFilter.toLowerCase();
    return data.sections.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.blocks.some((b) => b.title?.toLowerCase().includes(q) || b.body?.toLowerCase().includes(q)),
    );
  }, [data.sections, sectionFilter]);

  // Current sheet index among all sheets
  const currentSheetIdx = allSheets.findIndex((s) => s.slug === data.slug);
  const prevSheet = currentSheetIdx > 0 ? allSheets[currentSheetIdx - 1] : null;
  const nextSheet = currentSheetIdx >= 0 && currentSheetIdx < allSheets.length - 1 ? allSheets[currentSheetIdx + 1] : null;
  const currentSectionIdx = data.sections.findIndex((s) => s.slug === activeSlug);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Cheat sheet link copied to clipboard");
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* Fixed top reading progress indicator */}
      <div className="fixed top-0 left-0 right-0 z-50 h-0.5 bg-transparent pointer-events-none">
        <div
          className="h-full bg-accent transition-all duration-75 shadow-[0_0_8px_rgba(249,115,22,0.6)]"
          style={{ width: `${readingProgress}%` }}
        />
      </div>

      {/* Top Hierarchy & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <Breadcrumbs
          items={[
            { href: "/cheatsheets", label: "Cheat Sheets" },
            { label: data.title },
          ]}
        />

        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 px-2.5 text-xs font-semibold lg:hidden"
            onClick={() => setDrawerOpen(true)}
          >
            <ListOrdered className="h-3.5 w-3.5 text-accent" />
            <span>Outline ({currentSectionIdx >= 0 ? currentSectionIdx + 1 : 1}/{data.sections.length})</span>
          </Button>

          <button
            type="button"
            onClick={() => setCompact((prev) => !prev)}
            className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-steel-800 bg-steel-900/90 px-2.5 text-xs font-semibold text-muted-foreground hover:border-steel-700 hover:text-foreground transition-colors"
            title={compact ? "Switch to Relaxed Spacing" : "Switch to Compact Density"}
          >
            {compact ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
            <span className="hidden sm:inline">{compact ? "Relaxed" : "Compact"}</span>
          </button>

          <ListenButton text={cheatSheetSpeech(data)} />

          <NotesPanel
            context={{
              sourceType: "LESSON",
              sourceId: data.id,
              sourceTitle: `${data.title} Cheat Sheet`,
            }}
          />

          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-steel-800 bg-steel-900/90 text-muted-foreground hover:border-steel-700 hover:text-foreground transition-colors"
            title="Copy link"
            aria-label="Copy link"
          >
            <Share2 className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-steel-800 bg-steel-900/90 text-muted-foreground hover:border-steel-700 hover:text-foreground transition-colors"
            title="Print sheet / Save to PDF"
            aria-label="Print sheet"
          >
            <Printer className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Main 2-Column Sheet Layout */}
      <div className="grid items-start gap-5 lg:grid-cols-[18rem_minmax(0,1fr)]">
        {/* Desktop Sticky Table of Contents Sidebar */}
        <aside className="sticky top-16 hidden max-h-[calc(100vh-5rem)] w-72 shrink-0 flex-col overflow-y-auto rounded-2xl border border-steel-800/90 bg-steel-900/95 p-4 shadow-sm backdrop-blur-xl lg:flex scrollbar-none">
          <div className="border-b border-steel-800/80 pb-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-accent">Table of Contents</p>
              <span className="text-[10px] font-mono font-bold text-muted-foreground">
                {currentSectionIdx >= 0 ? currentSectionIdx + 1 : 1} / {data.sections.length}
              </span>
            </div>
            <h3 className="mt-1 truncate text-sm font-bold text-foreground">{data.title}</h3>

            {/* Quick Sibling Sheet Switcher */}
            {allSheets.length > 1 ? (
              <select
                className="select-field mt-2 w-full text-xs"
                value={data.slug}
                onChange={(e) => {
                  router.push(`/cheatsheets/${e.target.value}`);
                }}
              >
                {allSheets.map((s) => (
                  <option key={s.id} value={s.slug}>
                    {s.title} (~{s.estimated_minutes}m)
                  </option>
                ))}
              </select>
            ) : null}
          </div>

          {/* Section Filter Input */}
          <div className="relative my-3">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              placeholder="Filter sections…"
              className="w-full rounded-lg border border-steel-800 bg-steel-950/60 py-1.5 pl-7 pr-3 text-[11px] text-foreground placeholder:text-muted-foreground/70 focus:border-accent focus:outline-hidden"
            />
          </div>

          <nav aria-label="Sheet sections" className="flex-1 space-y-1 overflow-y-auto pr-1">
            {filteredSections.map((section, index) => {
              const active = section.slug === activeSlug;
              return (
                <a
                  key={section.slug}
                  href={`#${section.slug}`}
                  aria-current={active ? "true" : undefined}
                  onClick={() => setActiveSlug(section.slug)}
                  className={cn(
                    "group flex items-center justify-between gap-2 rounded-xl px-2.5 py-1.5 text-xs transition-all",
                    active
                      ? "border border-accent/40 bg-accent/10 font-bold text-foreground shadow-2xs"
                      : "text-muted-foreground hover:bg-steel-800/60 hover:text-foreground",
                  )}
                >
                  <span className="truncate">
                    {index + 1}. {section.title}
                  </span>
                  <span className="shrink-0 text-[10px] font-mono text-muted-foreground">
                    {section.blocks.length}
                  </span>
                </a>
              );
            })}
          </nav>

          <div className="mt-4 border-t border-steel-800/80 pt-3">
            <Link
              href="/cheatsheets"
              className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-accent transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>All Cheat Sheets</span>
            </Link>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="min-w-0 space-y-4">
          {/* Header Card */}
          <div className="rounded-2xl border border-steel-800/90 bg-steel-900/90 p-5 sm:p-6 shadow-2xs">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-accent/25 bg-accent/10 text-accent">
                    <BookOpen className="h-4 w-4" />
                  </span>
                  <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                    {data.title} Cheat Sheet
                  </h1>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{data.description}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted-foreground">
                <span className="flex items-center gap-1.5 rounded-full border border-steel-700/60 bg-steel-800/60 px-2.5 py-1">
                  <FileText className="h-3.5 w-3.5 text-accent" />
                  {data.section_count} reference sections
                </span>
                <span className="flex items-center gap-1.5 rounded-full border border-steel-700/60 bg-steel-800/60 px-2.5 py-1">
                  <Clock className="h-3.5 w-3.5 text-accent" />
                  ~{data.estimated_minutes} min read
                </span>
              </div>
            </div>
          </div>

          {/* Section Cards */}
          <div className="space-y-4">
            {data.sections.map((section, sIdx) => (
              <SectionCard
                key={section.slug}
                id={section.slug}
                className={cn("scroll-mt-20 overflow-hidden transition-all", compact ? "p-4" : "p-5 sm:p-6")}
              >
                <div className="flex items-center justify-between border-b border-steel-800/80 pb-3">
                  <h2 className="flex items-center gap-2.5 text-base font-bold tracking-tight text-foreground sm:text-lg">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-steel-800 text-xs font-bold tabular-nums text-muted-foreground">
                      {sIdx + 1}
                    </span>
                    {section.title}
                  </h2>
                  <span className="text-[11px] font-mono text-muted-foreground font-semibold">
                    {section.blocks.length} item{section.blocks.length > 1 ? "s" : ""}
                  </span>
                </div>

                <div className={cn("space-y-4", compact ? "mt-3 space-y-3" : "mt-5 space-y-5")}>
                  {section.blocks.map((block, bIdx) => (
                    <CheatSheetBlockRenderer
                      key={`${section.slug}-${bIdx}`}
                      block={block}
                      compact={compact}
                    />
                  ))}
                </div>
              </SectionCard>
            ))}
          </div>

          {/* Cross-Sheet Bottom Navigation Bar */}
          <div className="sticky bottom-3 z-10 rounded-2xl border border-steel-800/90 bg-steel-900/95 px-4 py-3 shadow-xl backdrop-blur-xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {prevSheet ? (
                <Button asChild variant="ghost" size="sm" className="max-w-[42%] justify-start truncate text-xs">
                  <Link href={prevSheet.href} className="truncate">
                    ← {prevSheet.title}
                  </Link>
                </Button>
              ) : (
                <span className="px-2 text-xs text-muted-foreground">First sheet</span>
              )}

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 px-3 text-xs lg:hidden"
                  onClick={() => setDrawerOpen(true)}
                >
                  <ListOrdered className="h-3.5 w-3.5 text-accent" />
                  <span>Sections</span>
                </Button>

                <Button asChild size="sm" variant="secondary" className="h-8 text-xs font-semibold">
                  <Link href="/cheatsheets">All Sheets</Link>
                </Button>
              </div>

              {nextSheet ? (
                <Button asChild variant="ghost" size="sm" className="max-w-[42%] justify-end truncate text-xs">
                  <Link href={nextSheet.href} className="truncate">
                    {nextSheet.title} →
                  </Link>
                </Button>
              ) : (
                <span className="px-2 text-xs text-muted-foreground">Last sheet</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Table of Contents Slide-Over Drawer */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-background/60 backdrop-blur-xs transition-opacity"
            aria-label="Close sections outline"
            onClick={() => setDrawerOpen(false)}
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Cheat Sheet Sections"
            className="relative flex h-full w-full max-w-md flex-col border-l border-steel-800/80 bg-steel-900 shadow-2xl"
          >
            <header className="flex items-start justify-between gap-3 border-b border-steel-800/80 bg-steel-950/40 px-5 py-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-accent">Sections Outline</p>
                <h3 className="mt-1 text-base font-bold text-foreground">{data.title}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {data.section_count} reference sections · ~{data.estimated_minutes}m
                </p>
              </div>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-steel-800 hover:text-foreground transition-colors"
                aria-label="Close drawer"
                onClick={() => setDrawerOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-auto p-4 space-y-1.5">
              {data.sections.map((section, index) => {
                const active = section.slug === activeSlug;
                return (
                  <a
                    key={section.slug}
                    href={`#${section.slug}`}
                    onClick={() => {
                      setActiveSlug(section.slug);
                      setDrawerOpen(false);
                    }}
                    className={cn(
                      "flex items-center justify-between gap-2 rounded-xl p-3 text-xs transition-all",
                      active
                        ? "border border-accent/40 bg-accent/10 font-bold text-foreground shadow-2xs"
                        : "border border-steel-800/60 bg-steel-950/30 text-muted-foreground hover:border-steel-700 hover:text-foreground",
                    )}
                  >
                    <span className="font-semibold">
                      {index + 1}. {section.title}
                    </span>
                    <span className="rounded-full bg-steel-800 px-1.5 py-0.5 text-[10px] font-mono font-bold text-muted-foreground">
                      {section.blocks.length} items
                    </span>
                  </a>
                );
              })}
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
