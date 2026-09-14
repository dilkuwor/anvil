"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Code2,
  ExternalLink,
  Layers,
  Network,
  Search,
  Sparkles,
  SlidersHorizontal,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { VizBlock } from "@/components/learn/viz/viz-block";
import {
  listVizCatalog,
  getViz,
  type VizCatalogItem,
  type VizCategory,
} from "@/components/learn/viz/registry";
import { cn } from "@/lib/utils";

export function VisualizationsView() {
  const searchParams = useSearchParams();
  const initialParam = searchParams.get("viz") || searchParams.get("id");

  const catalog = useMemo(() => listVizCatalog(), []);
  const dsaCount = useMemo(() => catalog.filter((c) => c.category === "dsa").length, [catalog]);
  const sdCount = useMemo(() => catalog.filter((c) => c.category === "system-design").length, [catalog]);

  // Selected visualizer state
  const [selectedId, setSelectedId] = useState<string>(() => {
    if (initialParam && getViz(initialParam)) {
      return initialParam.toLowerCase();
    }
    return catalog[0]?.definition.id ?? "sliding-window";
  });

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"ALL" | VizCategory>("ALL");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  // Sync state if URL query param changes
  useEffect(() => {
    if (initialParam && getViz(initialParam) && initialParam.toLowerCase() !== selectedId) {
      setSelectedId(initialParam.toLowerCase());
    }
  }, [initialParam, selectedId]);

  // Update URL param when selected visualizer changes
  function selectVisualizer(id: string, shouldScroll = false) {
    setSelectedId(id);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("viz", id);
      window.history.replaceState({}, "", url.toString());
    }
    if (shouldScroll && stageRef.current) {
      stageRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  // Keyboard shortcut "/" to focus search
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "/" && document.activeElement !== searchInputRef.current) {
        const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
        if (tag === "input" || tag === "textarea" || (e.target as HTMLElement)?.isContentEditable) return;
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "Escape" && document.activeElement === searchInputRef.current) {
        setSearchQuery("");
        searchInputRef.current?.blur();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Filtered visualizers for the catalog grid
  const filteredCatalog = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return catalog.filter((item) => {
      if (selectedCategory !== "ALL" && item.category !== selectedCategory) {
        return false;
      }
      if (!q) return true;
      const matchesTitle = item.definition.title.toLowerCase().includes(q);
      const matchesSummary = item.definition.summary.toLowerCase().includes(q);
      const matchesId = item.definition.id.toLowerCase().includes(q);
      const matchesTag = item.tags.some((tag) => tag.toLowerCase().includes(q));
      const matchesField = item.definition.fields.some(
        (f: { key: string; label: string }) =>
          f.key.toLowerCase().includes(q) || f.label.toLowerCase().includes(q),
      );
      return matchesTitle || matchesSummary || matchesId || matchesTag || matchesField;
    });
  }, [catalog, searchQuery, selectedCategory]);

  const activeItem = useMemo(() => {
    return catalog.find((c) => c.definition.id === selectedId) ?? catalog[0];
  }, [catalog, selectedId]);

  const currentIndex = catalog.findIndex((c) => c.definition.id === activeItem.definition.id);
  const prevItem = catalog[(currentIndex - 1 + catalog.length) % catalog.length];
  const nextItem = catalog[(currentIndex + 1) % catalog.length];

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <PageHeader
        title="Interactive Visualizers"
        description="Step-through visualizers for core data structures, algorithms, and distributed system patterns. Inspect invariants, test custom inputs, and learn what to say to the interviewer."
        meta={`${catalog.length} visualizers · ${dsaCount} Algorithms & DSA · ${sdCount} System Design`}
      />

      {/* Featured Interactive Stage */}
      <section
        ref={stageRef}
        aria-label="Active visualizer stage"
        className="rounded-2xl border border-steel-800 bg-gradient-to-b from-steel-900/60 to-steel-950/80 p-4 shadow-sm sm:p-6"
      >
        {/* Stage Header Controls */}
        <div className="flex flex-col gap-4 border-b border-steel-800/80 pb-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                activeItem.category === "dsa"
                  ? "border-teal/30 bg-teal/10 text-teal"
                  : "border-accent/30 bg-accent/10 text-accent",
              )}
            >
              {activeItem.category === "dsa" ? (
                <Code2 className="h-5 w-5" aria-hidden />
              ) : (
                <Network className="h-5 w-5" aria-hidden />
              )}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                    activeItem.category === "dsa"
                      ? "bg-teal/15 text-teal"
                      : "bg-accent/15 text-accent",
                  )}
                >
                  {activeItem.categoryLabel}
                </span>
                <span className="text-xs text-muted-foreground">
                  {currentIndex + 1} of {catalog.length}
                </span>
              </div>
              <h2 className="mt-0.5 truncate text-lg font-bold tracking-tight text-foreground sm:text-xl">
                {activeItem.definition.title}
              </h2>
            </div>
          </div>

          {/* Quick Switcher & Nav Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <select
                aria-label="Select visualizer"
                value={activeItem.definition.id}
                onChange={(e) => selectVisualizer(e.target.value)}
                className="select-field h-8 max-w-[200px] rounded-lg border border-steel-700 bg-steel-900 px-2.5 text-xs font-medium text-foreground sm:max-w-[240px]"
              >
                <optgroup label="Algorithms & Data Structures">
                  {catalog
                    .filter((c) => c.category === "dsa")
                    .map((item) => (
                      <option key={item.definition.id} value={item.definition.id}>
                        {item.definition.title}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="System Design Patterns">
                  {catalog
                    .filter((c) => c.category === "system-design")
                    .map((item) => (
                      <option key={item.definition.id} value={item.definition.id}>
                        {item.definition.title}
                      </option>
                    ))}
                </optgroup>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="secondary"
                size="sm"
                className="h-8 px-2.5 text-xs"
                onClick={() => selectVisualizer(prevItem.definition.id)}
                title={`Previous: ${prevItem.definition.title}`}
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Prev</span>
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="h-8 px-2.5 text-xs"
                onClick={() => selectVisualizer(nextItem.definition.id)}
                title={`Next: ${nextItem.definition.title}`}
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Tags & Simulator Link */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {activeItem.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md border border-steel-800 bg-steel-900/80 px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>

          {activeItem.definition.simulatorHref ? (
            <Button asChild variant="ghost" size="sm" className="h-7 gap-1 text-xs text-accent hover:text-accent-light">
              <Link href={activeItem.definition.simulatorHref}>
                <span>Open in System Design Simulator</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          ) : null}
        </div>

        {/* Live Interactive Player */}
        <div className="mt-4">
          <VizBlock key={activeItem.definition.id} id={activeItem.definition.id} params={{}} />
        </div>
      </section>

      {/* Catalog & Search Section */}
      <section className="space-y-4" aria-label="Visualizers catalog">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-bold tracking-tight text-foreground sm:text-lg">
              All Visualizers
            </h3>
            <p className="text-xs text-muted-foreground">
              Select any visualizer to load it into the interactive player above.
            </p>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-steel-800/80 bg-steel-950/40 p-1 scrollbar-none shrink-0">
            {[
              { id: "ALL", label: `All (${catalog.length})` },
              { id: "dsa", label: `Algorithms & DSA (${dsaCount})` },
              { id: "system-design", label: `System Design (${sdCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedCategory(tab.id as "ALL" | VizCategory)}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-semibold transition-all whitespace-nowrap",
                  selectedCategory === tab.id
                    ? "bg-steel-800 text-foreground border border-steel-700/80 shadow-2xs"
                    : "text-muted-foreground hover:bg-steel-800/40 hover:text-foreground border border-transparent",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            id="visualizer-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search visualizers (e.g. binary search, cache, quorum, heap, rate limit)... (Press / to search)"
            className="pl-9 pr-10 text-xs"
          />
          <kbd className="pointer-events-none absolute right-3.5 top-1/2 hidden -translate-y-1/2 rounded bg-steel-800 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground sm:inline-block">
            /
          </kbd>
        </div>

        {/* Visualizers Card Grid */}
        {filteredCatalog.length === 0 ? (
          <div className="rounded-2xl border border-steel-800/80 bg-steel-900/40 p-12 text-center">
            <SlidersHorizontal className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <h4 className="mt-3 text-sm font-bold text-foreground">No matching visualizers</h4>
            <p className="mt-1 text-xs text-muted-foreground">
              Try adjusting your search terms or filter selection.
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-4 text-xs"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("ALL");
              }}
            >
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCatalog.map((item) => {
              const isCurrent = item.definition.id === activeItem.definition.id;
              const isDsa = item.category === "dsa";
              return (
                <div
                  key={item.definition.id}
                  className={cn(
                    "group flex flex-col justify-between rounded-xl border p-4.5 transition-all duration-200",
                    isCurrent
                      ? "border-accent/60 bg-steel-900/90 shadow-md ring-1 ring-accent/30"
                      : "border-steel-800/90 bg-steel-950/40 hover:-translate-y-0.5 hover:border-steel-700 hover:bg-steel-900/60 hover:shadow-2xs",
                  )}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={cn(
                          "inline-flex h-8 w-8 items-center justify-center rounded-lg border",
                          isDsa
                            ? "border-teal/30 bg-teal/10 text-teal"
                            : "border-accent/30 bg-accent/10 text-accent",
                        )}
                      >
                        {isDsa ? <Code2 className="h-4 w-4" /> : <Network className="h-4 w-4" />}
                      </span>

                      {isCurrent ? (
                        <span className="flex items-center gap-1 rounded-full border border-accent/40 bg-accent/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
                          <Check className="h-3 w-3" />
                          Active Now
                        </span>
                      ) : (
                        <span className="rounded-full border border-steel-800 bg-steel-900/60 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                          {item.categoryLabel}
                        </span>
                      )}
                    </div>

                    <h4 className="mt-3 text-sm font-bold tracking-tight text-foreground transition-colors group-hover:text-accent">
                      {item.definition.title}
                    </h4>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                      {item.definition.summary}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-1">
                      {item.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="rounded bg-steel-900 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-steel-800/70 pt-3 text-xs">
                    <span className="text-[11px] text-muted-foreground">
                      {item.definition.fields.length} {item.definition.fields.length === 1 ? "field" : "fields"}
                    </span>

                    <Button
                      variant={isCurrent ? "secondary" : "ghost"}
                      size="sm"
                      className={cn(
                        "h-7 gap-1 px-2 text-xs font-semibold",
                        isCurrent ? "text-accent" : "text-muted-foreground group-hover:text-foreground",
                      )}
                      onClick={() => selectVisualizer(item.definition.id, true)}
                    >
                      <span>{isCurrent ? "Active in stage" : "Interact"}</span>
                      <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

