import { cardCatalog } from "@playbit/content";
import type { Card } from "@playbit/shared";

export const dailyCards: Card[] = cardCatalog.map((card) => ({
  ...card,
  sceneTags: [...card.sceneTags],
  enabled: true
}));

export function drawCard(previousIds: string[] = [], includeMagic = false): Card {
  const pool = dailyCards.filter(
    (card) => card.enabled && !previousIds.includes(card.id) && (includeMagic || card.category !== "magic")
  );
  const candidates = pool.length > 0 ? pool : dailyCards.filter((card) => card.enabled);
  return candidates[Math.floor(Math.random() * candidates.length)];
}
