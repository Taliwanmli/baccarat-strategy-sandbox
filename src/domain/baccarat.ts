import { Card, handTotal } from "./cards";
import { BaccaratShoe } from "./shoe";

export type Outcome = "P" | "B" | "T";
export type BetSide = "Player" | "Banker";

export interface BaccaratHand {
  playerCards: Card[];
  bankerCards: Card[];
  playerTotal: number;
  bankerTotal: number;
  outcome: Outcome;
  natural: boolean;
  shoeNumber: number;
  cardsRemaining: number;
}

export interface BetResolution {
  profit: number;
  result: "win" | "loss" | "push";
}

export function shouldBankerDraw(bankerTotal: number, playerThirdCard?: Card): boolean {
  if (!playerThirdCard) return bankerTotal <= 5;
  const third = playerThirdCard.value;
  if (bankerTotal <= 2) return true;
  if (bankerTotal === 3) return third !== 8;
  if (bankerTotal === 4) return third >= 2 && third <= 7;
  if (bankerTotal === 5) return third >= 4 && third <= 7;
  if (bankerTotal === 6) return third >= 6 && third <= 7;
  return false;
}

export function dealBaccaratHand(shoe: BaccaratShoe): BaccaratHand {
  shoe.ensureReadyToDeal();
  const shoeNumber = shoe.shoeNumber;
  const playerCards = [shoe.draw(), shoe.draw()];
  const bankerCards = [shoe.draw(), shoe.draw()];
  let playerTotal = handTotal(playerCards);
  let bankerTotal = handTotal(bankerCards);
  const natural = playerTotal >= 8 || bankerTotal >= 8;

  if (!natural) {
    let playerThirdCard: Card | undefined;
    if (playerTotal <= 5) {
      playerThirdCard = shoe.draw();
      playerCards.push(playerThirdCard);
      playerTotal = handTotal(playerCards);
    }

    if (shouldBankerDraw(bankerTotal, playerThirdCard)) {
      bankerCards.push(shoe.draw());
      bankerTotal = handTotal(bankerCards);
    }
  }

  const outcome: Outcome = playerTotal > bankerTotal ? "P" : bankerTotal > playerTotal ? "B" : "T";
  return {
    playerCards,
    bankerCards,
    playerTotal,
    bankerTotal,
    outcome,
    natural,
    shoeNumber,
    cardsRemaining: shoe.remainingCards,
  };
}

export function resolveMainBet(side: BetSide, stake: number, outcome: Outcome): BetResolution {
  if (outcome === "T") return { profit: 0, result: "push" };
  if ((side === "Player" && outcome === "P") || (side === "Banker" && outcome === "B")) {
    return { profit: side === "Player" ? stake : stake * 0.95, result: "win" };
  }
  return { profit: -stake, result: "loss" };
}
