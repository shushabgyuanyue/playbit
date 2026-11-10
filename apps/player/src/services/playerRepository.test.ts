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

  it("collapses the former two agreement recordings into one voice", () => {
    const state = createInitialState();
    const legacyVoice = { id: "legacy-challenge", assetId: "legacy-audio", durationMs: 2100, storage: "indexeddb" as const };
    const legacy = {
      ...state,
      draft: {
        ...state.draft,
        challengeVoice: legacyVoice,
        benefitVoice: { ...legacyVoice, id: "legacy-benefit", assetId: "legacy-benefit-audio" }
      },
      agreements: [{
        id: "legacy-agreement",
        text: "旧约定",
        benefit: "旧彩头",
        challengeVoice: legacyVoice,
        benefitVoice: { ...legacyVoice, id: "legacy-benefit", assetId: "legacy-benefit-audio" },
        signatures: { a: [], b: [] },
        createdAt: new Date().toISOString(),
        winner: null
      }]
    };

    const migrated = decodeState(JSON.stringify(legacy));
    expect(migrated.draft.voice.assetId).toBe("legacy-audio");
    expect(migrated.agreements[0]?.voice?.assetId).toBe("legacy-audio");
    expect("challengeVoice" in migrated.draft).toBe(false);
    expect("benefitVoice" in migrated.agreements[0]!).toBe(false);
  });

  it("moves the former mystery scene back into exploration", () => {
    const legacy = { ...createInitialState(), sceneId: "mystery", cardId: "mystery-common-person" };

    expect(decodeState(JSON.stringify(legacy)).sceneId).toBe("explore");
  });
});
