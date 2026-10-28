// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createInitialState } from "../../data/demo";
import type { PlayerState } from "../../data/types";
import { useCardDeck } from "./useCardDeck";

const player = vi.hoisted(() => ({ state: null as unknown as PlayerState, update: vi.fn() }));
vi.mock("../player/PlayerProvider", () => ({ usePlayer: () => player }));
let root: Root;
let host: HTMLDivElement;
let deck: ReturnType<typeof useCardDeck>;
function Harness() { deck = useCardDeck(); return createElement("span", null, deck.card.id); }
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  player.state = createInitialState();
  player.update.mockReset().mockImplementation((update: (state: PlayerState) => PlayerState) => { player.state = update(player.state); });
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); });
it("moves an old default into the new scene while retaining its saved data", async () => {
  player.state.cardId = "truth";
  await act(async () => root.render(createElement(Harness)));
  expect(deck.card.id).toBe("almost-touch");
  expect(player.state.cardId).toBe("almost-touch");
  expect(deck.pool.some(card => card.id === "truth" || card.sponsor)).toBe(false);
});
it("still opens an old card for pending issuance and in a personal deck", async () => {
  player.state.cardId = "truth";
  player.state.stakes = { truth: "早餐" };
  await act(async () => root.render(createElement(Harness)));
  expect(deck.card.id).toBe("truth");
  player.state = { ...player.state, stakes: {}, deckId: "old", decks: [{ id: "old", name: "Old", cardIds: ["truth", "memory"] }] };
  await act(async () => root.render(createElement(Harness)));
  expect(deck.card.id).toBe("truth");
  expect(deck.pool.map(card => card.id)).toEqual(["truth", "memory"]);
});
