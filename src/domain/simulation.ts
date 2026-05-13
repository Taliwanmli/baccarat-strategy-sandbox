import { dealBaccaratHand, Outcome } from "./baccarat";
import { formatCards } from "./cards";
import { HandHistoryRow } from "./history";
import { forkSeed } from "./rng";
import { BaccaratShoe, ShoeSettings } from "./shoe";
import {
  applyStrategyHand,
  createStrategyState,
  decidePlayerAfterBankerMartingale,
  shouldStopStrategy,
  StrategySettings,
  StrategyState,
} from "./strategy";

export const STRATEGY_HANDS_PER_SHOE = 80;

export interface OutcomeStats {
  totalHands: number;
  playerWins: number;
  bankerWins: number;
  ties: number;
}

export interface SessionResult {
  finalBankroll: number;
  profit: number;
  hands: number;
  bets: number;
  wins: number;
  losses: number;
  pushes: number;
  busted: boolean;
  profitable: boolean;
  targetReached: boolean;
  stopReason?: string;
  longestLosingLadder: number;
  largestDrawdown: number;
  stats: OutcomeStats;
  history: HandHistoryRow[];
  outcomes: Outcome[];
}

export interface StrategyBatchSummary {
  sessions: number;
  profitableSessions: number;
  profitablePercentage: number;
  targetReachedSessions: number;
  targetReachedPercentage: number;
  averageFinalBankroll: number;
  averageProfit: number;
  bestProfit: number;
  worstProfit: number;
  bustedSessions: number;
}

export function emptyStats(): OutcomeStats {
  return { totalHands: 0, playerWins: 0, bankerWins: 0, ties: 0 };
}

export function addOutcome(stats: OutcomeStats, outcome: Outcome): void {
  stats.totalHands += 1;
  if (outcome === "P") stats.playerWins += 1;
  else if (outcome === "B") stats.bankerWins += 1;
  else stats.ties += 1;
}

export function runChartHands(shoeSettings: ShoeSettings, hands: number): SessionResult {
  const shoe = new BaccaratShoe({ ...shoeSettings, seed: forkSeed(shoeSettings.seed, `chart:${hands}`) });
  const history: HandHistoryRow[] = [];
  const outcomes: Outcome[] = [];
  const stats = emptyStats();

  for (let i = 0; i < hands; i += 1) {
    const hand = dealBaccaratHand(shoe);
    addOutcome(stats, hand.outcome);
    outcomes.push(hand.outcome);
    history.push({
      id: history.length + 1,
      shoeNumber: hand.shoeNumber,
      playerCards: formatCards(hand.playerCards),
      playerTotal: hand.playerTotal,
      bankerCards: formatCards(hand.bankerCards),
      bankerTotal: hand.bankerTotal,
      outcome: hand.outcome,
      stake: 0,
      profit: 0,
      bankrollAfter: 0,
    });
  }

  return {
    finalBankroll: 0,
    profit: 0,
    hands,
    bets: 0,
    wins: 0,
    losses: 0,
    pushes: 0,
    busted: false,
    profitable: false,
    targetReached: false,
    stopReason: "chart hands complete",
    longestLosingLadder: 0,
    largestDrawdown: 0,
    stats,
    history,
    outcomes,
  };
}

export function runStrategySession(
  shoeSettings: ShoeSettings,
  strategySettings: StrategySettings,
  seedSuffix = "strategy-session",
  keepHistory = true,
): SessionResult {
  const shoe = new BaccaratShoe({ ...shoeSettings, decks: 8, cutCardThreshold: 0, seed: forkSeed(shoeSettings.seed, seedSuffix) });
  const strategy = createStrategyState(strategySettings);
  const history: HandHistoryRow[] = [];
  const outcomes: Outcome[] = [];
  const stats = emptyStats();
  let stopReason: string | undefined;
  let handsInCurrentShoe = 0;

  while (!stopReason) {
    const decision = decidePlayerAfterBankerMartingale(strategy, strategySettings);
    const preDealStop = shouldStopStrategy(strategy, strategySettings, decision);
    if (preDealStop) {
      stopReason = preDealStop;
      break;
    }

    if (handsInCurrentShoe >= STRATEGY_HANDS_PER_SHOE) {
      shoe.newShoe();
      handsInCurrentShoe = 0;
    }

    const hand = dealBaccaratHand(shoe);
    handsInCurrentShoe += 1;
    const overlay = applyStrategyHand(strategy, strategySettings, decision, hand);
    addOutcome(stats, hand.outcome);
    outcomes.push(hand.outcome);

    if (keepHistory) {
      history.push({
        id: history.length + 1,
        shoeNumber: hand.shoeNumber,
        playerCards: formatCards(hand.playerCards),
        playerTotal: hand.playerTotal,
        bankerCards: formatCards(hand.bankerCards),
        bankerTotal: hand.bankerTotal,
        outcome: hand.outcome,
        stake: 0,
        profit: 0,
        bankrollAfter: strategy.bankroll,
        strategy: overlay,
      });
    }

    const nextDecision = decidePlayerAfterBankerMartingale(strategy, strategySettings);
    stopReason = shouldStopStrategy(strategy, strategySettings, nextDecision);

    if (strategy.hands > strategySettings.targetBets * 100 + 1000) {
      stopReason = "safety hand limit reached";
    }
  }

  strategy.stopped = true;
  strategy.stopReason = stopReason;
  return makeSessionResult(strategy, strategySettings, stopReason, stats, history, outcomes);
}

export function runStrategySessionBatch(
  shoeSettings: ShoeSettings,
  strategySettings: StrategySettings,
  sessions: number,
  onProgress?: (completed: number) => void,
): StrategyBatchSummary {
  const totalSessions = Math.max(1, Math.floor(sessions));
  let profitableSessions = 0;
  let targetReachedSessions = 0;
  let bustedSessions = 0;
  let finalBankrollTotal = 0;
  let profitTotal = 0;
  let bestProfit = Number.NEGATIVE_INFINITY;
  let worstProfit = Number.POSITIVE_INFINITY;

  for (let i = 0; i < totalSessions; i += 1) {
    const result = runStrategySession(shoeSettings, strategySettings, `batch:${i}`, false);
    if (result.profit > 0) profitableSessions += 1;
    if (result.targetReached) targetReachedSessions += 1;
    if (result.busted) bustedSessions += 1;
    finalBankrollTotal += result.finalBankroll;
    profitTotal += result.profit;
    bestProfit = Math.max(bestProfit, result.profit);
    worstProfit = Math.min(worstProfit, result.profit);
    if ((i + 1) % 100 === 0) onProgress?.(i + 1);
  }

  onProgress?.(totalSessions);

  return {
    sessions: totalSessions,
    profitableSessions,
    profitablePercentage: (profitableSessions / totalSessions) * 100,
    targetReachedSessions,
    targetReachedPercentage: (targetReachedSessions / totalSessions) * 100,
    averageFinalBankroll: finalBankrollTotal / totalSessions,
    averageProfit: profitTotal / totalSessions,
    bestProfit,
    worstProfit,
    bustedSessions,
  };
}

function makeSessionResult(
  state: StrategyState,
  settings: StrategySettings,
  stopReason: string | undefined,
  stats: OutcomeStats,
  history: HandHistoryRow[],
  outcomes: Outcome[],
): SessionResult {
  const profit = state.bankroll - state.initialBankroll;
  return {
    finalBankroll: state.bankroll,
    profit,
    hands: state.hands,
    bets: state.bets,
    wins: state.wins,
    losses: state.losses,
    pushes: state.pushes,
    busted: stopReason === "bankroll cannot afford next bet",
    profitable: profit > 0,
    targetReached: stopReason === "profit target reached",
    stopReason,
    longestLosingLadder: state.longestLosingLadder,
    largestDrawdown: state.largestDrawdown,
    stats,
    history,
    outcomes,
  };
}
