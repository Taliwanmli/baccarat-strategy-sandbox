import { BaccaratHand, Outcome, resolveMainBet } from "./baccarat";

export type StrategyProfile = "player-after-banker-martingale" | "flat-bet-player";

export interface StrategySettings {
  profile: StrategyProfile;
  bankroll: number;
  baseUnit: number;
  targetBets: number;
  profitTarget: number;
  sessionRuns: number;
  chartHands: number;
}

export interface StrategyDecision {
  signal: boolean;
  active: boolean;
  shouldBet: boolean;
  stake: number;
  step: number;
  reason: string;
}

export interface StrategyHandOverlay {
  signal: boolean;
  active: boolean;
  placedBet: boolean;
  stake: number;
  step: number;
  betResult?: "win" | "loss" | "push";
  profit: number;
  bankrollAfter: number;
  stopped?: boolean;
  stopReason?: string;
}

export interface StrategyState {
  initialBankroll: number;
  bankroll: number;
  active: boolean;
  stepIndex: number;
  resolvedHistory: Outcome[];
  hands: number;
  bets: number;
  wins: number;
  losses: number;
  pushes: number;
  stopped: boolean;
  stopReason?: string;
  longestLosingLadder: number;
  currentLosingLadder: number;
  peakBankroll: number;
  largestDrawdown: number;
}

export const defaultStrategySettings: StrategySettings = {
  profile: "player-after-banker-martingale",
  bankroll: 635,
  baseUnit: 5,
  targetBets: 1000,
  profitTarget: 0,
  sessionRuns: 100,
  chartHands: 70,
};

export function makeProgression(baseUnit: number, steps: number): number[] {
  return Array.from({ length: Math.max(1, steps) }, (_, index) => baseUnit * 2 ** index);
}

export function createStrategyState(settings: StrategySettings): StrategyState {
  return {
    initialBankroll: settings.bankroll,
    bankroll: settings.bankroll,
    active: false,
    stepIndex: 0,
    resolvedHistory: [],
    hands: 0,
    bets: 0,
    wins: 0,
    losses: 0,
    pushes: 0,
    stopped: false,
    longestLosingLadder: 0,
    currentLosingLadder: 0,
    peakBankroll: settings.bankroll,
    largestDrawdown: 0,
  };
}

export function hasPlayerAfterBankerSignal(resolvedHistory: Outcome[]): boolean {
  const latest = resolvedHistory[resolvedHistory.length - 1];
  const previous = resolvedHistory[resolvedHistory.length - 2];
  return latest === "P" && previous === "B";
}

export function decidePlayerAfterBankerMartingale(state: StrategyState, settings: StrategySettings): StrategyDecision {
  const stake = settings.profile === "flat-bet-player" ? settings.baseUnit : settings.baseUnit * 2 ** state.stepIndex;
  if (settings.profile === "flat-bet-player") {
    if (state.bankroll < stake) {
      return { signal: true, active: true, shouldBet: false, stake, step: state.stepIndex, reason: "bankroll cannot afford next bet" };
    }
    return { signal: true, active: true, shouldBet: true, stake, step: 0, reason: "flat Player bet" };
  }

  const signal = !state.active && hasPlayerAfterBankerSignal(state.resolvedHistory);
  const active = state.active || signal;
  if (!active) {
    return {
      signal,
      active,
      shouldBet: false,
      stake,
      step: state.stepIndex,
      reason: "waiting for B -> P",
    };
  }

  if (state.bankroll < stake) {
    return { signal, active, shouldBet: false, stake, step: state.stepIndex, reason: "bankroll cannot afford next bet" };
  }

  return {
    signal,
    active,
    shouldBet: true,
    stake,
    step: state.stepIndex,
    reason: signal ? "B -> P entry" : "active Player bet",
  };
}

export function applyStrategyHand(
  state: StrategyState,
  settings: StrategySettings,
  decision: StrategyDecision,
  hand: BaccaratHand,
): StrategyHandOverlay {
  state.hands += 1;
  let profit = 0;
  let betResult: StrategyHandOverlay["betResult"];

  if (decision.shouldBet) {
    const resolved = resolveMainBet("Player", decision.stake, hand.outcome);
    profit = resolved.profit;
    betResult = resolved.result;
    state.bets += 1;
    state.bankroll += profit;
    state.active = true;

    if (settings.profile === "flat-bet-player") {
      state.active = true;
      state.stepIndex = 0;
      state.currentLosingLadder = 0;
      if (resolved.result === "win") state.wins += 1;
      else if (resolved.result === "loss") state.losses += 1;
      else state.pushes += 1;
    } else if (resolved.result === "win") {
      state.wins += 1;
      state.stepIndex = 0;
      state.currentLosingLadder = 0;
    } else if (resolved.result === "loss") {
      state.losses += 1;
      state.currentLosingLadder += 1;
      state.longestLosingLadder = Math.max(state.longestLosingLadder, state.currentLosingLadder);
      state.stepIndex += 1;
      state.active = false;
    } else {
      state.pushes += 1;
    }
  }

  if (hand.outcome !== "T") {
    state.resolvedHistory.push(hand.outcome);
  }

  state.peakBankroll = Math.max(state.peakBankroll, state.bankroll);
  state.largestDrawdown = Math.max(state.largestDrawdown, state.peakBankroll - state.bankroll);

  return {
    signal: decision.signal,
    active: state.active,
    placedBet: decision.shouldBet,
    stake: decision.shouldBet ? decision.stake : 0,
    step: decision.step,
    betResult,
    profit,
    bankrollAfter: state.bankroll,
  };
}

export function shouldStopStrategy(state: StrategyState, settings: StrategySettings, nextDecision: StrategyDecision): string | undefined {
  if (settings.profitTarget > 0 && state.bankroll - state.initialBankroll >= settings.profitTarget) {
    return "profit target reached";
  }
  if (state.bets >= settings.targetBets) {
    return "target bet count reached";
  }
  if (nextDecision.active && !nextDecision.shouldBet && nextDecision.reason.includes("bankroll")) {
    return "bankroll cannot afford next bet";
  }
  return undefined;
}
