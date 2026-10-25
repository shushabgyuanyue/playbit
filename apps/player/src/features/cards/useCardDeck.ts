import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cards } from "../../data/demo";
import { usePlayer } from "../player/PlayerProvider";

export function useCardDeck(rememberedFlippedCardId: string | null = null) {
  const { state, update } = usePlayer();
  const [flipped, setFlipped] = useState(() => rememberedFlippedCardId === state.cardId);
  const [slide, setSlide] = useState("");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const sliding = useRef(false);
  const pool = useMemo(() => {
    const deck = state.decks.find(d => d.id === state.deckId);
    const selected = deck ? cards.filter(c => deck.cardIds.includes(c.id)) : cards.filter(c => c.sceneIds.includes(state.sceneId));
    return selected.length ? selected : cards;
  }, [state.decks, state.deckId, state.sceneId]);
  const card = pool.find(c => c.id === state.cardId) ?? pool[0]!;
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const selectionKey = `${state.sceneId}:${state.deckId ?? ""}`;
  const previousSelectionKey = useRef(selectionKey);
  useEffect(() => {
    if (previousSelectionKey.current === selectionKey) return;
    previousSelectionKey.current = selectionKey;
    setFlipped(false);
  }, [selectionKey]);
  const go = useCallback((direction: number) => {
    if (sliding.current || pool.length < 2) return;
    sliding.current = true;
    setSlide(direction > 0 ? "swipe-up" : "swipe-down");
    timers.current.push(setTimeout(() => {
      const next = (pool.findIndex(c => c.id === card.id) + direction + pool.length) % pool.length;
      update(current => ({ ...current, cardId: pool[next]!.id }));
      setFlipped(false);
      setSlide(direction > 0 ? "enter-up" : "enter-down");
      timers.current.push(setTimeout(() => { setSlide(""); sliding.current = false; }, 300));
    }, 180));
  }, [card.id, pool, update]);
  return { card, pool, flipped, setFlipped, slide, go };
}
