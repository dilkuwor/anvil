import type { SimulationRequest, SimulationResult } from "../models/types";
import { runSimulation } from "./run";

export function simulateAsync(request: SimulationRequest): Promise<SimulationResult> {
  if (typeof Worker === "undefined") {
    return Promise.resolve(runSimulation(request));
  }
  return new Promise((resolve, reject) => {
    try {
      const worker = new Worker(new URL("../workers/simulation.worker.ts", import.meta.url), { type: "module" });
      const timer = window.setTimeout(() => {
        worker.terminate();
        resolve(runSimulation(request));
      }, 4000);
      worker.onmessage = (event: MessageEvent<{ ok: boolean; result?: SimulationResult; error?: string }>) => {
        window.clearTimeout(timer);
        worker.terminate();
        if (event.data.ok && event.data.result) resolve(event.data.result);
        else reject(new Error(event.data.error || "Simulation failed."));
      };
      worker.onerror = () => {
        window.clearTimeout(timer);
        worker.terminate();
        resolve(runSimulation(request));
      };
      worker.postMessage(request);
    } catch {
      resolve(runSimulation(request));
    }
  });
}
