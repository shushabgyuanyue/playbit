import { describe, expect, it } from "vitest";
import { createInitialState } from "../data/demo";
import { decodeState } from "./playerRepository";

describe("player repository migrations", () => {
  it("adds an empty stake voice map for older saved sessions", () => {
    const legacy = JSON.parse(JSON.stringify(createInitialState())) as Record<string, unknown>;
    delete legacy.stakeVoices;

    expect(decodeState(JSON.stringify(legacy)).stakeVoices).toEqual({});
  });

  it("keeps an issued agreement in the benefit issuance stage", () => {
    const state = createInitialState();
    const agreement = {
      id: "agreement-legacy",
      text: "谁负责洗碗",
      benefit: "周末早餐",
      signatures: { a: [], b: [] },
      createdAt: new Date().toISOString(),
      winner: null
    };
    const legacy = {
      ...state,
      draft: { ...state.draft, step: 3 as const, agreementId: agreement.id, text: agreement.text, benefit: agreement.benefit },
      agreements: [agreement]
    };

    expect(decodeState(JSON.stringify(legacy)).draft.step).toBe(3);
  });

  it("moves the former mystery scene back into exploration", () => {
    const legacy = { ...createInitialState(), sceneId: "mystery", cardId: "mystery-common-person" };

    expect(decodeState(JSON.stringify(legacy)).sceneId).toBe("explore");
  });
});
