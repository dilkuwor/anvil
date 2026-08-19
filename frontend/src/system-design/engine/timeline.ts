import { healthFromUtil, type Latency, type SimulationResult, type SloVerdict, type TimelineSample } from "../models/types";

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/** Peak-hour ramp is modeled as 8 hours (0:00 → 8:00). */
export function formatTimelineClock(t: number): string {
  const minutes = Math.round(clamp01(t) * 8 * 60);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}:${mins.toString().padStart(2, "0")}`;
}

export function interpolateTimeline(timeline: TimelineSample[], t: number): TimelineSample {
  const x = clamp01(t);
  if (!timeline.length) {
    return { t: x, label: formatTimelineClock(x), rps: 0, cpu: 0, p95: 0, errors: 0 };
  }
  if (timeline.length === 1) {
    return { ...timeline[0], t: x, label: formatTimelineClock(x) };
  }
  let index = 0;
  while (index < timeline.length - 2 && timeline[index + 1].t < x) index += 1;
  const a = timeline[index];
  const b = timeline[index + 1];
  const span = b.t - a.t || 1;
  const u = clamp01((x - a.t) / span);
  return {
    t: x,
    label: formatTimelineClock(x),
    rps: lerp(a.rps, b.rps, u),
    cpu: lerp(a.cpu, b.cpu, u),
    p95: lerp(a.p95, b.p95, u),
    errors: lerp(a.errors, b.errors, u),
  };
}

export function viewAtCursor(result: SimulationResult, cursor: number): SimulationResult {
  if (!result.timeline.length) return result;
  const sample = interpolateTimeline(result.timeline, cursor);
  const peak = result.timeline[result.timeline.length - 1];
  const load = peak.rps > 0 ? sample.rps / peak.rps : clamp01(cursor);
  const latScale = peak.p95 > 0 ? sample.p95 / peak.p95 : 1;
  const errScale = peak.errors > 0 ? sample.errors / peak.errors : load;

  const nodes = Object.fromEntries(
    Object.entries(result.nodes).map(([id, node]) => {
      const utilization = Object.fromEntries(
        Object.entries(node.utilization).map(([key, amount]) => [key, amount * load]),
      );
      return [
        id,
        {
          ...node,
          incomingRps: node.incomingRps * load,
          processedRps: node.processedRps * load,
          droppedRps: node.droppedRps * load,
          rejectedRps: node.rejectedRps * load,
          latency: {
            p50: node.latency.p50 * latScale,
            p95: node.latency.p95 * latScale,
            p99: node.latency.p99 * latScale,
          },
          utilization,
          health: healthFromUtil(Object.values(utilization)),
        },
      ];
    }),
  );

  const edges = Object.fromEntries(
    Object.entries(result.edges).map(([id, edge]) => [id, { ...edge, rps: edge.rps * load }]),
  );

  const errorRate = result.errorRate * errScale;
  const latency = {
    p50: result.latency.p50 * latScale,
    p95: result.latency.p95 * latScale,
    p99: result.latency.p99 * latScale,
  };

  return {
    ...result,
    throughput: {
      incomingRps: result.throughput.incomingRps * load,
      processedRps: result.throughput.processedRps * load,
      droppedRps: result.throughput.droppedRps * load,
      rejectedRps: result.throughput.rejectedRps * load,
    },
    latency,
    errorRate,
    availability: Math.max(0, 1 - errorRate),
    nodes,
    edges,
    slo: liveSlo(result.slo, latency, errorRate, Math.max(0, 1 - errorRate)),
    criticalPath: result.criticalPath.map((hop) => ({ ...hop, ms: hop.ms * latScale })),
  };
}

function liveSlo(slo: SloVerdict[], latency: Latency, errorRate: number, availability: number): SloVerdict[] {
  return slo.map((item) => {
    if (item.key === "availability") {
      const actual = `${(availability * 100).toFixed(3)}%`;
      const target = Number.parseFloat(item.target) / 100;
      return { ...item, actual, pass: Number.isFinite(target) ? availability >= target : item.pass };
    }
    if (item.key === "p95Ms") {
      const actual = `${Math.round(latency.p95)}ms`;
      const target = Number.parseFloat(item.target.replace(/[^\d.]/g, ""));
      return { ...item, actual, pass: Number.isFinite(target) ? latency.p95 <= target : item.pass };
    }
    if (item.key === "p99Ms") {
      const actual = `${Math.round(latency.p99)}ms`;
      const target = Number.parseFloat(item.target.replace(/[^\d.]/g, ""));
      return { ...item, actual, pass: Number.isFinite(target) ? latency.p99 <= target : item.pass };
    }
    if (item.key === "errorRate") {
      const actual = `${(errorRate * 100).toFixed(2)}%`;
      const target = Number.parseFloat(item.target.replace(/[^\d.]/g, "")) / 100;
      return { ...item, actual, pass: Number.isFinite(target) ? errorRate <= target : item.pass };
    }
    return item;
  });
}
