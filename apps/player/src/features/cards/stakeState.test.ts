import { describe, expect, it } from "vitest";
import { createInitialState } from "../../data/demo";
import type { VoiceNote } from "../../data/types";
import { saveStakeVoice } from "./stakeState";

describe("stake voice state", () => {
  it("keeps the flip lock and original record time when ASR writes back", () => {
    const voice: VoiceNote = { id: "voice-1", assetId: "asset-1", durationMs: 1200, storage: "indexeddb", transcript: "输的人请喝一杯" };
    const initial = createInitialState();
    const state = {
      ...initial,
      stakes: { "card-1": "输的人请喝一杯" },
      stakeRecords: { "card-1": { cardId: "card-1", title: "输的人请喝一杯", createdAt: "2026-01-01T00:00:00.000Z", locked: true } }
    };

    const next = saveStakeVoice(state, "card-1", voice, "默认彩头", "2026-01-01T00:01:00.000Z");

    expect(next.stakeVoices["card-1"]).toEqual(voice);
    expect(next.stakeRecords["card-1"]).toEqual({ cardId: "card-1", title: "输的人请喝一杯", createdAt: "2026-01-01T00:00:00.000Z", locked: true });
  });
});
