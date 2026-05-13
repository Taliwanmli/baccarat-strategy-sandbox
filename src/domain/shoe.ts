import { Card, makeDeck } from "./cards";
import { createRng, Rng } from "./rng";

export interface ShoeSettings {
  decks: 6 | 8;
  cutCardThreshold: number;
  seed?: string;
}

export class BaccaratShoe {
  private cards: Card[] = [];
  private rng: Rng;
  private settings: ShoeSettings;
  shoeNumber = 0;

  constructor(settings: ShoeSettings) {
    this.settings = settings;
    this.rng = createRng(settings.seed);
    this.newShoe();
  }

  get remainingCards(): number {
    return this.cards.length;
  }

  get currentSettings(): ShoeSettings {
    return this.settings;
  }

  updateSettings(settings: ShoeSettings): void {
    this.settings = settings;
    this.rng = createRng(settings.seed);
    this.shoeNumber = 0;
    this.newShoe();
  }

  ensureReadyToDeal(): void {
    if (this.cards.length < this.settings.cutCardThreshold) {
      this.newShoe();
    }
  }

  draw(): Card {
    if (this.cards.length === 0) this.newShoe();
    const card = this.cards.pop();
    if (!card) throw new Error("Shoe exhausted");
    return card;
  }

  newShoe(): void {
    const deck = makeDeck();
    this.cards = Array.from({ length: this.settings.decks }, () => deck).flat().map((card) => ({ ...card }));
    this.shuffle();
    this.shoeNumber += 1;
  }

  private shuffle(): void {
    for (let i = this.cards.length - 1; i > 0; i -= 1) {
      const j = Math.floor(this.rng() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }
}

export const defaultShoeSettings: ShoeSettings = {
  decks: 8,
  cutCardThreshold: 14,
};
