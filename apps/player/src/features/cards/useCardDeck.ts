import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cards } from "../../data/demo";
import { usePlayer } from "../player/PlayerProvider";

export const CARD_MOVE_MS = 280;

export function useCardDeck(rememberedFlippedCardId: string | null = null) {
  const { state, update } = usePlayer();
  const [slide, setSlide] = useState("");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const sliding = useRef(false);
  const pool = useMemo(() => {
    const deck = state.decks.find(d => d.id === state.deckId);
    const selected = deck ? cards.filter(c => deck.cardIds.includes(c.id)) : cards.filter(c => c.sceneIds.includes(state.sceneId));
    const recovered = cards.find(c => c.id === state.cardId && !c.sceneIds.length && state.stakes[c.id]);
    if (recovered && !selected.some(c => c.id === recovered.id)) return [recovered, ...selected];
    return selected.length ? selected : cards.filter(c => c.sceneIds.includes("date"));
  }, [state.decks, state.deckId, state.sceneId, state.cardId, state.stakes]);
  const card = pool.find(c => c.id === state.cardId) ?? pool[0]!;
  const [flipped, setFlipped] = useState(() => rememberedFlippedCardId === card.id);
  useEffect(() => {
    if (state.cardId !== card.id) update(current => ({ ...current, cardId: card.id }));
  }, [state.cardId, card.id, update]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const selectionKey = `${state.sceneId}:${state.deckId ?? ""}`;
  const previousSelectionKey = useRef(selectionKey);
  useEffect(() => {
    if (previousSelectionKey.current === selectionKey) return;
    previousSelectionKey.current = selectionKey;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    sliding.current = false;
    setSlide("");
    setFlipped(false);
  }, [selectionKey]);
  const go = useCallback((direction: number) => {
    if (sliding.current || pool.length < 2) return;
    timers.current = [];
    sliding.current = true;
    setSlide(direction > 0 ? "swipe-up" : "swipe-down");
    timers.current.push(setTimeout(() => {
      const next = (pool.findIndex(c => c.id === card.id) + direction + pool.length) % pool.length;
      update(current => ({ ...current, cardId: pool[next]!.id }));
      setFlipped(false);
      setSlide(direction > 0 ? "enter-up" : "enter-down");
      timers.current.push(setTimeout(() => { setSlide(""); sliding.current = false; }, 80));
    }, CARD_MOVE_MS));
  }, [card.id, pool, update]);
  return { card, pool, flipped, setFlipped, slide, go };
}
