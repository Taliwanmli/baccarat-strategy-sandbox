import { runChartHands, runStrategySession, runStrategySessionBatch } from "../domain/simulation";
import { ShoeSettings } from "../domain/shoe";
import { StrategySettings } from "../domain/strategy";

type WorkerRequest =
  | { type: "runStrategy"; shoeSettings: ShoeSettings; strategySettings: StrategySettings }
  | { type: "runStrategyBatch"; shoeSettings: ShoeSettings; strategySettings: StrategySettings; sessions: number }
  | { type: "runChart"; shoeSettings: ShoeSettings; hands: number };

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  try {
    const request = event.data;
    if (request.type === "runStrategy") {
      self.postMessage({ type: "strategyComplete", result: runStrategySession(request.shoeSettings, request.strategySettings, "worker:strategy", true) });
    } else if (request.type === "runStrategyBatch") {
      const summary = runStrategySessionBatch(request.shoeSettings, request.strategySettings, request.sessions, (completed) => {
        self.postMessage({ type: "batchProgress", completed });
      });
      self.postMessage({ type: "batchComplete", summary });
    } else {
      self.postMessage({ type: "chartComplete", result: runChartHands(request.shoeSettings, request.hands) });
    }
  } catch (error) {
    self.postMessage({ type: "error", message: error instanceof Error ? error.message : "Unknown simulation error" });
  }
};

export {};
