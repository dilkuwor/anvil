"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BookOpen, Clock, FileText, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Input } from "@/components/ui/input";
import { CardSkeleton, ErrorState } from "@/components/ui/state";
import { api } from "@/lib/api";
import type { CheatSheetCard } from "@/lib/cheatsheets";
import { queryKeys } from "@/lib/queries";
import { cn } from "@/lib/utils";

export function CheatSheetIndex() {
  const [query, setQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("ALL");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const sheets = useQuery({
    queryKey: queryKeys.cheatSheets,
    queryFn: () => api.get<CheatSheetCard[]>("/api/v1/cheatsheets"),
  });

  // Shortcut key "/"
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "/" && document.activeElement !== searchInputRef.current) {
        const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
        if (tag === "input" || tag === "textarea" || (e.target as HTMLElement)?.isContentEditable) return;
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "Escape" && document.activeElement === searchInputRef.current) {
        setQuery("");
        searchInputRef.current?.blur();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const list = useMemo(() => sheets.data ?? [], [sheets.data]);

  const filteredSheets = useMemo(() => {
    let result = list;
    const q = query.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.slug.toLowerCase().includes(q),
      );
    }
    if (selectedTag !== "ALL") {
      result = result.filter((s) => {
        const slug = s.slug.toLowerCase();
        if (selectedTag === "SYSTEM_DESIGN") return slug.includes("system") || slug.includes("design") || slug.includes("estimation");
        if (selectedTag === "DSA") return slug.includes("dsa") || slug.includes("algorithm") || slug.includes("structure") || slug.includes("tree");
        if (selectedTag === "CS") return slug.includes("cs") || slug.includes("network") || slug.includes("os") || slug.includes("concurrency");
        return true;
      });
    }
    return result;
  }, [list, query, selectedTag]);

  if (sheets.isLoading) return <CardSkeleton rows={4} />;
  if (sheets.isError || !sheets.data) {
    return <ErrorState message="Unable to load cheat sheets." onRetry={() => sheets.refetch()} />;
  }

  const totalSections = list.reduce((acc, curr) => acc + (curr.section_count || 0), 0);
  const totalMinutes = list.reduce((acc, curr) => acc + (curr.estimated_minutes || 0), 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Cheat Sheets"
        description="High-density review for the night before — or the hour before — a software engineering interview."
        meta={`${list.length} sheets · ${totalSections} reference sections · ~${totalMinutes}m read`}
      />

      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            id="cheatsheet-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search formulas, CAP theorem, Big-O, concurrency… (Press / to search)"
            className="pl-9 pr-10 text-xs"
          />
          <kbd className="pointer-events-none absolute right-3.5 top-1/2 hidden -translate-y-1/2 rounded bg-steel-800 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground sm:inline-block">
            /
          </kbd>
        </div>

        <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-steel-800/80 bg-steel-950/40 p-1 scrollbar-none shrink-0">
          {[
            { id: "ALL", label: "All Sheets" },
            { id: "SYSTEM_DESIGN", label: "System Design" },
            { id: "DSA", label: "Algorithms & DSA" },
            { id: "CS", label: "CS Fundamentals" },
          ].map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => setSelectedTag(tag.id)}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-semibold transition-all whitespace-nowrap",
                selectedTag === tag.id
                  ? "bg-steel-800 text-foreground border border-steel-700/80 shadow-2xs"
                  : "text-muted-foreground hover:bg-steel-800/40 hover:text-foreground border border-transparent",
              )}
            >
              {tag.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sheets Grid */}
      {filteredSheets.length === 0 ? (
        <div className="rounded-2xl border border-steel-800/80 bg-steel-900/40 p-12 text-center">
          <BookOpen className="mx-auto h-8 w-8 text-muted-foreground/60" />
          <h3 className="mt-3 text-sm font-bold text-foreground">No matching cheat sheets</h3>
          <p className="mt-1 text-xs text-muted-foreground">Try adjusting your search terms or filter selection.</p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setSelectedTag("ALL");
            }}
            className="mt-4 rounded-xl border border-steel-700 bg-steel-800 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-steel-700 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filteredSheets.map((sheet) => (
            <Link
              key={sheet.id}
              href={sheet.href}
              className="group flex flex-col justify-between rounded-2xl border border-steel-800/90 bg-steel-900/90 p-6 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:bg-steel-900 hover:shadow-md"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-accent/25 bg-accent/10 text-accent transition-all duration-200 group-hover:scale-105 group-hover:border-accent/40 group-hover:bg-accent/15 group-hover:shadow-[0_0_12px_rgba(249,115,22,0.15)]">
                    <BookOpen className="h-5 w-5" />
                  </span>
                  <span className="flex items-center gap-1.5 rounded-full border border-steel-700/60 bg-steel-800/60 px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                    <Clock className="h-3 w-3 text-accent" />
                    ~{sheet.estimated_minutes} min read
                  </span>
                </div>

                <h2 className="mt-4 text-base font-bold tracking-tight text-foreground transition-colors group-hover:text-accent sm:text-lg">
                  {sheet.title}
                </h2>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground line-clamp-2">
                  {sheet.description}
                </p>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-steel-800/70 pt-4 text-xs font-medium">
                <span className="flex items-center gap-1.5 text-muted-foreground font-semibold">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  {sheet.section_count} reference sections
                </span>
                <span className="inline-flex items-center gap-1.5 font-bold text-accent transition-transform group-hover:translate-x-1">
                  Open Sheet
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
