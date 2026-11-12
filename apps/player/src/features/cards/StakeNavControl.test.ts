// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { STAKE_NAV_ACTION, StakeNavControl } from "./StakeNavControl";

vi.mock("../player/PlayerProvider", () => ({
  usePlayer: () => ({
    state: {
      cardId: "card-1",
      stakes: { "card-1": "输的人请喝一杯" },
      stakeVoices: {},
      stakeRecords: {},
      issuedStakes: { "card-1": { id: "issued-1", cardId: "card-1", cardTitle: "谜题", title: "请喝一杯", issuerName: "主持人", signature: [], issuedAt: "2026-01-01T00:00:00.000Z", source: "game", status: "pending_claim" } }
    },
    update: vi.fn(),
    notify: vi.fn()
  })
}));
vi.mock("../promise/useVoiceRecorder", () => ({ useVoiceRecorder: () => ({ status: "idle", start: vi.fn(), stop: vi.fn(), cancel: vi.fn(), elapsedMs: 0, stream: null }) }));
vi.mock("../promise/recordingCue", () => ({ recordingCue: vi.fn() }));
vi.mock("../promise/VoiceRecordingOverlay", () => ({ VoiceRecordingOverlay: () => null }));

it("reopens pending issuance actions from the bottom stake control", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const host = document.createElement("div");
  const root = createRoot(host);
  const actions: string[] = [];
  const onAction = (event: Event) => actions.push((event as CustomEvent<{ action: string }>).detail.action);
  window.addEventListener(STAKE_NAV_ACTION, onAction);
  try {
    await act(async () => root.render(createElement(StakeNavControl)));
    await act(async () => host.querySelector<HTMLButtonElement>(".nav-stake")!.click());
    expect(actions).toEqual(["issue"]);
  } finally {
    window.removeEventListener(STAKE_NAV_ACTION, onAction);
    await act(async () => root.unmount());
    vi.unstubAllGlobals();
  }
});
