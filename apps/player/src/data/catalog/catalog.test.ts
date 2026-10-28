import { existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
import { cards, createInitialState } from "../demo";
import { decodeState } from "../../services/playerRepository";
import { cardDrafts, sceneCards, scenes } from "./index";
import { gameplays } from "./gameplays";

it("offers playable scene variants with real, bounded local media", () => {
  expect(cardDrafts).toHaveLength(30);
  expect(new Set(cardDrafts.map(card => card.id)).size).toBe(30);
  for (const scene of scenes) expect(sceneCards.filter(card => card.sceneIds.includes(scene.id)).length).toBeGreaterThan(1);
  const paths = new Set<string>();
  for (const draft of cardDrafts) {
    expect(gameplays[draft.l1].l0.length).toBeGreaterThan(0);
    expect(draft.adaptation.length).toBeGreaterThan(20);
    expect(draft.steps).toHaveLength(3);
    expect(draft.scenes.every(id => scenes.some(scene => scene.id === id))).toBe(true);
    if (draft.sponsor) {
      expect(draft.scenes).toEqual(["shop"]);
      expect(draft.sponsor.disclosure).toMatch(/示例$/);
      expect(draft.sponsor.note).toBeTruthy();
    }
    if (draft.media) {
      paths.add(draft.media.src);
      if (draft.media.kind === "video") paths.add(draft.media.poster);
    }
  }
  expect(new Set(cardDrafts.map(card => card.media?.kind ?? "text"))).toEqual(new Set(["text", "image", "audio", "video"]));
  let bytes = 0;
  for (const path of paths) {
    expect(path.startsWith("/media/cards/")).toBe(true);
    const file = fileURLToPath(new URL(`../../../public${path}`, import.meta.url));
    expect(existsSync(file)).toBe(true);
    bytes += statSync(file).size;
  }
  expect(bytes).toBeLessThan(200_000);
});

it("keeps old saved decks, pending stakes, agreements and owned coupons during the catalog replacement", () => {
  const state = createInitialState();
  state.cardId = "truth";
  state.decks = [{ id: "my-old-deck", name: "以前收藏的", cardIds: ["truth", "memory"] }];
  state.stakes = { truth: "请喝一杯" };
  state.agreements = [{ id: "saved", text: "约好了", benefit: "早餐", signatures: { a: [], b: [] }, createdAt: "2026-10-28T10:00:00Z", winner: null }];
  const restored = decodeState(JSON.stringify(state));
  expect(restored.cardId).toBe("truth");
  expect(restored.decks).toEqual(state.decks);
  expect(restored.stakes.truth).toBe("请喝一杯");
  expect(restored.agreements[0]?.id).toBe("saved");
  expect(restored.coupons).toEqual(state.coupons);
  expect(cards.find(card => card.id === "truth")?.sceneIds).toEqual([]);
});
