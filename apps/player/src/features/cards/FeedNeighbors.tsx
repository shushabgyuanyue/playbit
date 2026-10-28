import type { GameCard as Card, PlayerState } from "../../data/types";
import { GameCard } from "./GameCard";

const noop = () => {};

export function FeedNeighbors({ pool, cardId, stakes, issuedStakes }: { pool: Card[]; cardId: string; stakes: PlayerState["stakes"]; issuedStakes: PlayerState["issuedStakes"] }) {
  if (pool.length < 2) return null;
  const index = pool.findIndex(card => card.id === cardId);
  return <>{[-1, 1].map(direction => {
    const card = pool[(index + direction + pool.length) % pool.length]!;
    return <div className={`feed-neighbor ${direction > 0 ? "feed-next" : "feed-previous"}`} key={direction} aria-hidden="true" inert>
      <GameCard card={card} active={false} flipped={false} slide="" stake={stakes[card.id]} stakeIssued={Boolean(issuedStakes[card.id])} onFlip={noop} onStake={noop} onIssue={noop} />
    </div>;
  })}</>;
}
