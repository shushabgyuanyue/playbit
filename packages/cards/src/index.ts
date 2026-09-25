import { cardCatalog } from "@playbit/content";
import type { Card } from "@playbit/shared";

export const dailyCards: Card[] = cardCatalog.map((card) => ({ ...card }));

export function drawCard(previousIds: string[] = [], mode?: Card["mode"]): Card {
  const eligible = mode ? dailyCards.filter((card) => card.mode === mode) : dailyCards;
  const pool = eligible.filter((card) => !previousIds.includes(card.id));
  const candidates = pool.length > 0 ? pool : eligible;
  return candidates[Math.floor(Math.random() * candidates.length)];
}
