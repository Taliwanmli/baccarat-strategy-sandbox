import { describe, expect, it } from "vitest";
import { BaccaratHand, dealBaccaratHand, resolveMainBet, shouldBankerDraw } from "./baccarat";
import { Card, Rank } from "./cards";
import { runStrategySession, runStrategySessionBatch, STRATEGY_HANDS_PER_SHOE } from "./simulation";
import { BaccaratShoe } from "./shoe";
import {
  applyStrategyHand,
  createStrategyState,
  decidePlayerAfterBankerMartingale,
  defaultStrategySettings,
  hasPlayerAfterBankerSignal,
  shouldStopStrategy,
} from "./strategy";

function card(rank: Rank): Card {
  return { rank, suit: "spades", value: rank === "A" ? 1 : ["10", "J", "Q", "K"].includes(rank) ? 0 : Number(rank), code: `${rank}S` };
}

function fixedShoe(cards: Card[]) {
  let remaining = cards.length;
  return {
    shoeNumber: 1,
    get remainingCards() {
      return remaining;
    },
    ensureReadyToDeal: () => undefined,
    draw: () => {
      remaining -= 1;
      const next = cards.shift();
      if (!next) throw new Error("empty test shoe");
      return next;
    },
  } as unknown as BaccaratShoe;
}

describe("Punto Banco engine", () => {
  it("stops third-card drawing on naturals", () => {
    const shoe = fixedShoe([card("A"), card("7"), card("A"), card("A"), card("9"), card("9")]);
    const hand = dealBaccaratHand(shoe);
    expect(hand.natural).toBe(true);
    expect(hand.playerCards).toHaveLength(2);
    expect(hand.bankerCards).toHaveLength(2);
    expect(hand.cardsRemaining).toBe(2);
  });

  it("applies Player draw and stand rules", () => {
    const drawShoe = fixedShoe([card("2"), card("3"), card("4"), card("2"), card("9")]);
    expect(dealBaccaratHand(drawShoe).playerCards).toHaveLength(3);

    const standShoe = fixedShoe([card("3"), card("4"), card("2"), card("2"), card("9")]);
    expect(dealBaccaratHand(standShoe).playerCards).toHaveLength(2);
  });

  it("matches the Banker third-card tableau", () => {
    expect(shouldBankerDraw(2, card("8"))).toBe(true);
    expect(shouldBankerDraw(3, card("8"))).toBe(false);
    expect(shouldBankerDraw(3, card("7"))).toBe(true);
    expect(shouldBankerDraw(4, card("2"))).toBe(true);
    expect(shouldBankerDraw(4, card("8"))).toBe(false);
    expect(shouldBankerDraw(5, card("4"))).toBe(true);
    expect(shouldBankerDraw(5, card("3"))).toBe(false);
    expect(shouldBankerDraw(6, card("6"))).toBe(true);
    expect(shouldBankerDraw(6, card("5"))).toBe(false);
    expect(shouldBankerDraw(7, card("7"))).toBe(false);
  });

  it("uses correct main bet payouts and tie pushes", () => {
    expect(resolveMainBet("Player", 10, "P")).toEqual({ profit: 10, result: "win" });
    expect(resolveMainBet("Banker", 10, "B")).toEqual({ profit: 9.5, result: "win" });
    expect(resolveMainBet("Player", 10, "B")).toEqual({ profit: -10, result: "loss" });
    expect(resolveMainBet("Banker", 10, "T")).toEqual({ profit: 0, result: "push" });
  });
});

describe("Player after Banker Martingale", () => {
  it("signals only after a resolved Banker then Player pattern", () => {
    expect(hasPlayerAfterBankerSignal(["B", "P"])).toBe(true);
    expect(hasPlayerAfterBankerSignal(["P", "P"])).toBe(false);
    expect(hasPlayerAfterBankerSignal(["B", "T", "P"])).toBe(false);
  });

  it("decides before the next hand and updates only after resolution", () => {
    const settings = { ...defaultStrategySettings, bankroll: 100, baseUnit: 5 };
    const state = createStrategyState(settings);
    state.resolvedHistory = ["B", "P"];
    const decision = decidePlayerAfterBankerMartingale(state, settings);
    expect(decision.shouldBet).toBe(true);
    expect(decision.signal).toBe(true);

    const losingHand: BaccaratHand = {
      outcome: "B",
      playerCards: [],
      bankerCards: [],
      playerTotal: 1,
      bankerTotal: 2,
      natural: false,
      shoeNumber: 1,
      cardsRemaining: 400,
    };
    const overlay = applyStrategyHand(state, settings, decision, losingHand);
    expect(overlay.betResult).toBe("loss");
    expect(state.bankroll).toBe(95);
    expect(state.stepIndex).toBe(1);
    expect(state.active).toBe(false);
    expect(state.resolvedHistory).toEqual(["B", "P", "B"]);
  });

  it("does not let ties break resolved P/B history or advance the ladder", () => {
    const settings = { ...defaultStrategySettings, bankroll: 100, baseUnit: 5 };
    const state = createStrategyState(settings);
    state.resolvedHistory = ["B", "P"];
    const decision = decidePlayerAfterBankerMartingale(state, settings);
    applyStrategyHand(
      state,
      settings,
      decision,
      { outcome: "T", playerCards: [], bankerCards: [], playerTotal: 4, bankerTotal: 4, natural: false, shoeNumber: 1, cardsRemaining: 400 },
    );
    expect(state.bankroll).toBe(100);
    expect(state.stepIndex).toBe(0);
    expect(state.resolvedHistory).toEqual(["B", "P"]);
  });

  it("stops finite-bankroll sessions when the next required bet cannot be funded", () => {
    const settings = { ...defaultStrategySettings, bankroll: 4, baseUnit: 5 };
    const state = createStrategyState(settings);
    state.resolvedHistory = ["B", "P"];
    const decision = decidePlayerAfterBankerMartingale(state, settings);
    expect(decision.signal).toBe(true);
    expect(decision.shouldBet).toBe(false);
    expect(shouldStopStrategy(state, settings, decision)).toBe("bankroll cannot afford next bet");
  });

  it("resets to the unit stake after a recovery win", () => {
    const settings = { ...defaultStrategySettings, bankroll: 100, baseUnit: 5 };
    const state = createStrategyState(settings);
    state.resolvedHistory = ["B", "P"];

    const loss = decidePlayerAfterBankerMartingale(state, settings);
    applyStrategyHand(state, settings, loss, {
      outcome: "B",
      playerCards: [],
      bankerCards: [],
      playerTotal: 1,
      bankerTotal: 2,
      natural: false,
      shoeNumber: 1,
      cardsRemaining: 400,
    });
    const paused = decidePlayerAfterBankerMartingale(state, settings);
    expect(paused.shouldBet).toBe(false);
    expect(paused.stake).toBe(10);

    applyStrategyHand(state, settings, paused, {
      outcome: "P",
      playerCards: [],
      bankerCards: [],
      playerTotal: 3,
      bankerTotal: 2,
      natural: false,
      shoeNumber: 1,
      cardsRemaining: 398,
    });

    const win = decidePlayerAfterBankerMartingale(state, settings);
    expect(win.shouldBet).toBe(true);
    expect(win.stake).toBe(10);
    applyStrategyHand(state, settings, win, {
      outcome: "P",
      playerCards: [],
      bankerCards: [],
      playerTotal: 3,
      bankerTotal: 2,
      natural: false,
      shoeNumber: 1,
      cardsRemaining: 396,
    });
    expect(state.stepIndex).toBe(0);
    expect(decidePlayerAfterBankerMartingale(state, settings).stake).toBe(5);
  });

  it("does not keep betting through a Banker streak after a loss", () => {
    const settings = { ...defaultStrategySettings, bankroll: 100, baseUnit: 5 };
    const state = createStrategyState(settings);
    state.resolvedHistory = ["B", "P"];

    const firstBet = decidePlayerAfterBankerMartingale(state, settings);
    applyStrategyHand(state, settings, firstBet, {
      outcome: "B",
      playerCards: [],
      bankerCards: [],
      playerTotal: 1,
      bankerTotal: 2,
      natural: false,
      shoeNumber: 1,
      cardsRemaining: 400,
    });

    const nextAfterB = decidePlayerAfterBankerMartingale(state, settings);
    expect(nextAfterB.shouldBet).toBe(false);
    expect(nextAfterB.reason).toBe("waiting for B -> P");
  });

  it("reshuffles strategy sessions every 80 hands without resetting strategy progress", () => {
    const result = runStrategySession(
      { decks: 8, cutCardThreshold: 14, seed: "eighty-hand-shoe-test" },
      { ...defaultStrategySettings, bankroll: 1_000_000, baseUnit: 5, targetBets: 100 },
      "test",
      true,
    );

    expect(result.history.length).toBeGreaterThan(STRATEGY_HANDS_PER_SHOE);
    expect(result.history[STRATEGY_HANDS_PER_SHOE - 1].shoeNumber).toBe(1);
    expect(result.history[STRATEGY_HANDS_PER_SHOE].shoeNumber).toBe(2);
    expect(result.bets).toBe(100);
  });

  it("summarizes profitable percentage across many strategy sessions", () => {
    const summary = runStrategySessionBatch(
      { decks: 8, cutCardThreshold: 14, seed: "batch-summary-test" },
      { ...defaultStrategySettings, bankroll: 635, baseUnit: 5, targetBets: 10 },
      5,
    );

    expect(summary.sessions).toBe(5);
    expect(summary.profitableSessions).toBeGreaterThanOrEqual(0);
    expect(summary.profitableSessions).toBeLessThanOrEqual(5);
    expect(summary.profitablePercentage).toBe((summary.profitableSessions / 5) * 100);
  });

  it("stops a strategy session when the profit target is reached", () => {
    const result = runStrategySession(
      { decks: 8, cutCardThreshold: 14, seed: "profit-target-test" },
      { ...defaultStrategySettings, bankroll: 635, baseUnit: 5, targetBets: 1000, profitTarget: 5 },
      "test",
      true,
    );

    expect(result.stopReason).toBe("profit target reached");
    expect(result.targetReached).toBe(true);
    expect(result.profit).toBeGreaterThanOrEqual(5);
    expect(result.bets).toBeLessThan(1000);
  });

  it("summarizes profit target hit percentage across strategy sessions", () => {
    const summary = runStrategySessionBatch(
      { decks: 8, cutCardThreshold: 14, seed: "batch-target-test" },
      { ...defaultStrategySettings, bankroll: 635, baseUnit: 5, targetBets: 20, profitTarget: 5 },
      5,
    );

    expect(summary.sessions).toBe(5);
    expect(summary.targetReachedSessions).toBeGreaterThanOrEqual(0);
    expect(summary.targetReachedSessions).toBeLessThanOrEqual(5);
    expect(summary.targetReachedPercentage).toBe((summary.targetReachedSessions / 5) * 100);
  });

  it("has a flat Player profile that bets the same Player unit every hand", () => {
    const settings = {
      ...defaultStrategySettings,
      profile: "flat-bet-player" as const,
      bankroll: 500,
      baseUnit: 5,
    };
    const state = createStrategyState(settings);

    const first = decidePlayerAfterBankerMartingale(state, settings);
    expect(first.shouldBet).toBe(true);
    expect(first.stake).toBe(5);
    expect(first.reason).toBe("flat Player bet");

    applyStrategyHand(state, settings, first, {
      outcome: "B",
      playerCards: [],
      bankerCards: [],
      playerTotal: 1,
      bankerTotal: 2,
      natural: false,
      shoeNumber: 1,
      cardsRemaining: 400,
    });

    const second = decidePlayerAfterBankerMartingale(state, settings);
    expect(second.shouldBet).toBe(true);
    expect(second.stake).toBe(5);
    expect(state.stepIndex).toBe(0);
    expect(state.longestLosingLadder).toBe(0);

    applyStrategyHand(state, settings, second, {
      outcome: "P",
      playerCards: [],
      bankerCards: [],
      playerTotal: 3,
      bankerTotal: 2,
      natural: false,
      shoeNumber: 1,
      cardsRemaining: 396,
    });

    const third = decidePlayerAfterBankerMartingale(state, settings);
    expect(third.shouldBet).toBe(true);
    expect(third.stake).toBe(5);
  });
});
