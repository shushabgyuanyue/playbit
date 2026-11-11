import type { GameCard as Card, PlayerState } from "../../data/types";
import { GameCard } from "./GameCard";
import type { CardPalette } from "./CardMedia";

const noop = () => {};

export function FeedNeighbors({ pool, cardId, stakeVoices, onPalette }: { pool: Card[]; cardId: string; stakeVoices: PlayerState["stakeVoices"]; onPalette?: (cardId: string, palette: CardPalette) => void }) {
  if (pool.length < 2) return null;
  const index = pool.findIndex(card => card.id === cardId);
  return <>{[-1, 1].map(direction => {
    const card = pool[(index + direction + pool.length) % pool.length]!;
    return <div className={`feed-neighbor ${direction > 0 ? "feed-next" : "feed-previous"}`} key={`${card.id}-${direction}`} aria-hidden="true" inert>
      <GameCard card={card} active={false} flipped={false} slide="" stakeVoice={stakeVoices[card.id]} onFlip={noop} onPalette={palette => onPalette?.(card.id, palette)} />
    </div>;
  })}</>;
}
