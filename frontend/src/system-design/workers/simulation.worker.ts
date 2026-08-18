import { runSimulation } from "../engine/run";
import type { SimulationRequest } from "../models/types";

self.onmessage = (event: MessageEvent<SimulationRequest>) => {
  try {
    self.postMessage({ ok: true, result: runSimulation(event.data) });
  } catch (error) {
    self.postMessage({ ok: false, error: error instanceof Error ? error.message : "Simulation failed." });
  }
};
