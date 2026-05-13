import { BetSide } from "./baccarat";
import { StrategyHandOverlay } from "./strategy";

export interface HandHistoryRow {
  id: number;
  shoeNumber: number;
  playerCards: string;
  playerTotal: number;
  bankerCards: string;
  bankerTotal: number;
  outcome: "P" | "B" | "T";
  manualBetSide?: BetSide;
  stake: number;
  profit: number;
  bankrollAfter: number;
  strategy?: StrategyHandOverlay;
}
