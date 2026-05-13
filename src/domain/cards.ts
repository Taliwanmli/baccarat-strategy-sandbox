export type Suit = "clubs" | "diamonds" | "hearts" | "spades";
export type Rank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";

export interface Card {
  rank: Rank;
  suit: Suit;
  value: number;
  code: string;
}

export const suits: Suit[] = ["clubs", "diamonds", "hearts", "spades"];
export const ranks: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

export function cardValue(rank: Rank): number {
  if (rank === "A") return 1;
  if (rank === "10" || rank === "J" || rank === "Q" || rank === "K") return 0;
  return Number(rank);
}

export function makeDeck(): Card[] {
  return suits.flatMap((suit) =>
    ranks.map((rank) => ({
      rank,
      suit,
      value: cardValue(rank),
      code: `${rank}${suit[0].toUpperCase()}`,
    })),
  );
}

export function formatCard(card: Card): string {
  const suitSymbol: Record<Suit, string> = {
    clubs: "C",
    diamonds: "D",
    hearts: "H",
    spades: "S",
  };
  return `${card.rank}${suitSymbol[card.suit]}`;
}

export function formatCards(cards: Card[]): string {
  return cards.map(formatCard).join(" ");
}

export function handTotal(cards: Card[]): number {
  return cards.reduce((sum, card) => sum + card.value, 0) % 10;
}
