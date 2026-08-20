"use client";

import { ReactFlowProvider } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { applyScenarioWorkload, scenarioBySlug, useSystemDesignCatalog } from "@/lib/system-design-catalog";
import { simulateAsync } from "../engine/client";
import { viewAtCursor } from "../engine/timeline";
import { designFromSample, sampleFromCatalog } from "../models/samples";
import type { ActiveFailure, ConfigValue, DesignEdge, DesignNode, Difficulty, SimulationResult, SystemDesign } from "../models/types";
import { listResults, loadCurrent, newDesign, saveCurrent, saveDesign, saveResult } from "../state/persist";
import { uid } from "../utils/ids";
import { BottomPanel } from "./bottom-panel";
import { SimulatorCanvas } from "./canvas";
import { Inspector } from "./inspector";
import { Palette } from "./palette";
import { NotesPanel } from "@/components/notes/notes-drawer";
import { SimulatorHelp, SimulatorHelpButton } from "./simulator-help";

export function SimulatorApp() {
  return (
    <ReactFlowProvider>
      <SimulatorWorkspace />
    </ReactFlowProvider>
  );
}

function SimulatorWorkspace() {
  const search = useSearchParams();
  const catalog = useSystemDesignCatalog();
  const appliedProblem = useRef<string | null>(null);
  const appliedSample = useRef<string | null>(null);
  const [design, setDesign] = useState<SystemDesign>(() => loadCurrent() ?? newDesign());
  const [selectedId, setSelectedId] = useState<string | null>(design.nodes[0]?.id ?? null);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [previous, setPrevious] = useState<SimulationResult | null>(null);
  const [failures, setFailures] = useState<ActiveFailure[]>([]);
  const [busy, setBusy] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [cursor, setCursor] = useState(1);
  const undo = useRef<SystemDesign[]>([]);
  const redo = useRef<SystemDesign[]>([]);

  useEffect(() => {
    const sampleSlug = search.get("sample");
    const sample = sampleFromCatalog(catalog.data, sampleSlug);
    if (sampleSlug && sample && appliedSample.current !== sampleSlug) {
      appliedSample.current = sampleSlug;
      const next = designFromSample(sample);
      setDesign(next);
      setSelectedId(next.nodes[0]?.id ?? null);
      setResult(null);
      return;
    }
    if (sampleSlug) return;
    const slug = search.get("problem");
    const item = scenarioBySlug(catalog.data, slug ?? undefined);
    if (!item || appliedProblem.current === item.slug) return;
    appliedProblem.current = item.slug;
    setDesign((current) => {
      const base = current.problemSlug === item.slug ? current : newDesign(item.title);
      return applyScenarioWorkload(base, item);
    });
  }, [catalog.data, search]);

  useEffect(() => {
    const handle = window.setTimeout(() => saveCurrent(design), 400);
    return () => window.clearTimeout(handle);
  }, [design]);

  if (!result && playing) {
    setPlaying(false);
  }

  useEffect(() => {
    if (!result || !playing) return;
    const tick = window.setInterval(() => {
      setCursor((value) => (value >= 1 ? 0 : Math.min(1, value + 0.02 * speed)));
    }, 80);
    return () => window.clearInterval(tick);
  }, [playing, result, speed]);

  const live = result ? viewAtCursor(result, cursor) : null;

  const selected = design.nodes.find((node) => node.id === selectedId) ?? null;

  function commit(next: SystemDesign) {
    undo.current = [...undo.current, design].slice(-30);
    redo.current = [];
    setDesign(next);
    setResult(null);
  }

  function updateGraph(nodes: DesignNode[], edges: DesignEdge[]) {
    commit({ ...design, nodes, edges });
  }

  async function simulate() {
    setBusy(true);
    try {
      const next = await simulateAsync({ design, failures });
      if (result) setPrevious(result);
      setResult(next);
      saveResult(next);
      setCursor(1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Simulation failed.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === "s") {
        event.preventDefault();
        const saved = saveDesign(design);
        setDesign(saved);
        toast.success("Architecture saved.");
      }
      if ((event.metaKey || event.ctrlKey) && event.key === "z") {
        event.preventDefault();
        const prior = undo.current.pop();
        if (!prior) return;
        redo.current.push(design);
        setDesign(prior);
      }
      if ((event.metaKey || event.ctrlKey) && event.key === "d" && selected) {
        event.preventDefault();
        const copy: DesignNode = { ...selected, id: `${selected.id}_copy`, x: selected.x + 40, y: selected.y + 40, label: `${selected.label} copy` };
        commit({ ...design, nodes: [...design.nodes, copy] });
        setSelectedId(copy.id);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [design, selected]);

  const history = listResults(design.id).slice(0, 2);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-steel-800 px-3 py-2">
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">System Design Simulator</div>
          <div className="mt-0.5 flex items-center gap-2">
            <input
              value={design.name}
              onChange={(event) => setDesign({ ...design, name: event.target.value })}
              className="bg-transparent text-sm font-semibold tracking-tight outline-none"
            />
            <Link href="/system-design" className="text-[12px] text-muted-foreground hover:text-accent">
              Hub
            </Link>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <NotesPanel
            context={{
              sourceType: "SYSTEM_DESIGN",
              sourceId: design.problemSlug || search.get("problem") || search.get("sample") || "general",
              sourceTitle: design.name || "System Design",
            }}
          />
          <SimulatorHelpButton expanded={helpOpen} onClick={() => setHelpOpen(true)} />
          <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
            Level
            <select
              className="select-field h-8 w-[8.75rem]"
              value={design.difficulty}
              onChange={(event) => setDesign({ ...design, difficulty: event.target.value as Difficulty })}
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="expert">Expert</option>
            </select>
          </label>
          <span className="hidden h-5 w-px bg-steel-800 sm:block" aria-hidden />
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              title="Load the URL Shortener sample architecture"
              disabled={!sampleFromCatalog(catalog.data, "url-shortener")}
              onClick={() => {
                const sample = sampleFromCatalog(catalog.data, "url-shortener");
                if (!sample) return;
                const next = designFromSample(sample);
                commit(next);
                setSelectedId(next.nodes[0]?.id ?? null);
                setResult(null);
                toast.success(`Loaded the ${sample.name} sample.`);
              }}
            >
              Sample
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                commit(newDesign());
                setSelectedId(null);
                setResult(null);
              }}
            >
              Reset
            </Button>
          </div>
          <span className="hidden h-5 w-px bg-steel-800 sm:block" aria-hidden />
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                const saved = saveDesign(design);
                setDesign(saved);
                toast.success("Saved locally.");
              }}
            >
              Save
            </Button>
            <Button size="sm" disabled={busy} onClick={() => void simulate()}>
              {busy ? "Simulating…" : "Simulate"}
            </Button>
          </div>
        </div>
      </header>

      {result?.warnings.length ? (
        <div className="border-b border-steel-800 px-4 py-1.5 text-[12px] text-muted-foreground">{result.warnings[0]}</div>
      ) : null}

      {result?.bottlenecks[0] ? (
        <div className="border-b border-coral/30 bg-coral/5 px-4 py-2 text-[12px] leading-5">
          <span className="font-medium text-coral">Primary bottleneck · {result.bottlenecks[0].label}</span>
          <span className="text-muted-foreground"> — {result.bottlenecks[0].why}</span>
        </div>
      ) : null}

      <div className="flex min-h-0 min-w-0 flex-1">
        <Palette />
        <SimulatorCanvas
          key={design.id}
          designNodes={design.nodes}
          designEdges={design.edges}
          result={live}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onGraph={updateGraph}
          onDuplicate={(id) => {
            const source = design.nodes.find((node) => node.id === id);
            if (!source) return;
            const copy: DesignNode = {
              ...source,
              id: uid("n"),
              x: source.x + 36,
              y: source.y + 36,
              label: `${source.label} copy`,
            };
            commit({ ...design, nodes: [...design.nodes, copy] });
            setSelectedId(copy.id);
          }}
          onToggleDisabled={(id) => {
            commit({
              ...design,
              nodes: design.nodes.map((node) => (node.id === id ? { ...node, disabled: !node.disabled } : node)),
            });
          }}
          onDelete={(id) => {
            commit({
              ...design,
              nodes: design.nodes.filter((node) => node.id !== id),
              edges: design.edges.filter((edge) => edge.source !== id && edge.target !== id),
            });
            if (selectedId === id) setSelectedId(null);
          }}
        />
        <Inspector
          node={selected}
          metrics={selected ? live?.nodes[selected.id] : undefined}
          difficulty={design.difficulty}
          onRename={(label) =>
            commit({ ...design, nodes: design.nodes.map((node) => (node.id === selectedId ? { ...node, label } : node)) })
          }
          onChange={(key, value: ConfigValue) =>
            commit({
              ...design,
              nodes: design.nodes.map((node) =>
                node.id === selectedId ? { ...node, config: { ...node.config, [key]: value } } : node,
              ),
            })
          }
        />
      </div>

      <SimulatorHelp open={helpOpen} onClose={() => setHelpOpen(false)} />

      <BottomPanel
        workload={design.workload}
        slo={design.slo}
        result={live}
        previous={previous ?? history[1] ?? null}
        failures={failures}
        playing={playing}
        speed={speed}
        cursor={cursor}
        onWorkload={(workload) => commit({ ...design, workload })}
        onSlo={(slo) => commit({ ...design, slo })}
        onFailures={setFailures}
        onPlay={() => {
          setPlaying((value) => {
            if (value) return false;
            if (cursor >= 0.99) setCursor(0);
            return true;
          });
        }}
        onSpeed={setSpeed}
        onCursor={(value) => {
          setPlaying(false);
          setCursor(value);
        }}
      />
    </div>
  );
}
