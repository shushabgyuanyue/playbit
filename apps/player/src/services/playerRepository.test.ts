import { describe, expect, it } from "vitest";
import { createInitialState } from "../data/demo";
import { decodeState } from "./playerRepository";

describe("playerRepository", () => {
  it("returns a valid anonymous state when storage is empty or malformed", () => {
    const empty = decodeState(null);
    const malformed = decodeState("{\"version\":1,\"decks\":[]}");
    expect(empty.version).toBe(1);
    expect(empty.cardId).toBe("truth");
    expect(malformed).toEqual(createInitialState());
  });

  it("rejects stale or unsafe persisted content", () => {
    const state = createInitialState();
    expect(decodeState(JSON.stringify({ ...state, version: 2 }))).toEqual(createInitialState());
    expect(decodeState(JSON.stringify({ ...state, cardId: "missing" }))).toEqual(createInitialState());
  });
});
