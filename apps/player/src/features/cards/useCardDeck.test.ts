// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createInitialState } from "../../data/demo";
import { cards } from "../../data/demo";
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

it("explores every current card without bringing retired cards into the feed", async () => {
  player.state.sceneId = "explore";
  player.state.deckId = null;
  await act(async () => root.render(createElement(Harness)));

  expect(deck.pool.map(card => card.id)).toEqual(cards.filter(card => card.sceneIds.length > 0 || card.gameplayId).map(card => card.id));
  expect(deck.pool.some(card => card.sceneIds.includes("date"))).toBe(true);
  expect(deck.pool.some(card => card.sceneIds.includes("shop"))).toBe(true);
  expect(deck.pool.some(card => card.id === "truth")).toBe(false);
});

it("uses every card with the same L1 gameplay while type mode is active", async () => {
  player.state.sceneId = "explore";
  player.state.deckId = null;
  player.state.cardId = "mystery-common-person";
  await act(async () => root.render(createElement(() => {
    deck = useCardDeck(null, "yes-no");
    return createElement("span", null, deck.card.id);
  })));

  expect(deck.pool).toHaveLength(6);
  expect(new Set(deck.pool.map(card => card.gameplayId))).toEqual(new Set(["yes-no"]));
  expect(deck.card.id).toBe("mystery-common-person");
});

it("starts exploration from its first card when switching modes", async () => {
  await act(async () => root.render(createElement(Harness)));
  player.state = { ...player.state, sceneId: "explore", deckId: null, cardId: "truth" };
  await act(async () => root.render(createElement(Harness)));

  expect(deck.card.id).toBe(cards.find(card => card.sceneIds.length > 0)?.id);
  expect(player.state.cardId).toBe(deck.card.id);
});
