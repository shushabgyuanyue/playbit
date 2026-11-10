// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { playerCopy as copy } from "@playbit/content/player";
import { emptyDraft } from "../../data/demo";
import { VoiceAgreementEditor } from "./VoiceAgreementEditor";

const playback = vi.hoisted(() => ({
  toggle: vi.fn(),
  playing: false,
  loading: false,
  error: ""
}));

vi.mock("./useVoicePlayback", () => ({ useVoicePlayback: () => playback }));

describe("voice agreement editor", () => {
  let root: Root;
  let host: HTMLDivElement;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    playback.toggle.mockReset();
    playback.playing = false;
    playback.loading = false;
    playback.error = "";
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
  });

  it("keeps original playback available when transcription is absent", async () => {
    const draft = emptyDraft();
    draft.voice.assetId = "saved-voice";
    draft.voice.durationMs = 2400;
    draft.text = copy.promise.voice.challengeLabel;

    await act(async () => root.render(createElement(VoiceAgreementEditor, { draft })));

    expect(host.textContent).toContain(copy.promise.voice.savedWithoutTranscript);
    const playButton = host.querySelector<HTMLButtonElement>(".agreement-voice-playback");
    expect(playButton?.disabled).toBe(false);
    expect(playButton?.getAttribute("aria-label")).toContain(copy.promise.shareCard.listenChallenge);
    await act(async () => playButton?.click());
    expect(playback.toggle).toHaveBeenCalledOnce();
  });

  it("shows recognized text without adding a second boxed panel", async () => {
    const draft = emptyDraft();
    draft.voice.assetId = "saved-voice";
    draft.voice.transcript = "输的人请喝一杯";
    draft.text = draft.voice.transcript;

    await act(async () => root.render(createElement(VoiceAgreementEditor, { draft })));

    expect(host.querySelector(".agreement-voice-transcript")?.textContent).toBe(draft.voice.transcript);
    expect(host.querySelector(".agreement-voice-card")).toBeNull();
    expect(host.querySelector(".agreement-voice-playback")).not.toBeNull();
  });
});
