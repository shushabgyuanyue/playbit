// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emptyDraft } from "../../data/demo";
import type { VoiceNote } from "../../data/types";
import { loadVoiceAsset } from "../../services/voiceRepository";
import { useVoicePlayback } from "./useVoicePlayback";

vi.mock("../../services/voiceRepository", () => ({ loadVoiceAsset: vi.fn() }));

class TestAudio {
  static instances: TestAudio[] = [];
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  play = vi.fn().mockResolvedValue(undefined);
  pause = vi.fn();

  constructor(public source: string) {
    TestAudio.instances.push(this);
  }
}

describe("voice playback", () => {
  let root: Root;
  let host: HTMLDivElement;
  let playback: ReturnType<typeof useVoicePlayback>;
  const createObjectURL = vi.fn(() => "blob:recorded-voice");
  const revokeObjectURL = vi.fn();

  function Probe({ voice }: { voice: VoiceNote }) {
    playback = useVoicePlayback(voice);
    return null;
  }

  beforeEach(async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("Audio", TestAudio);
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
    TestAudio.instances = [];
    vi.mocked(loadVoiceAsset).mockReset().mockResolvedValue(new Blob(["recorded audio"], { type: "audio/webm" }));
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    await act(async () => root.render(createElement(Probe, { voice: { ...emptyDraft().voice, assetId: "saved-voice", durationMs: 1400 } })));
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
  });

  it("loads and plays a saved local recording, then releases playback resources", async () => {
    await act(async () => playback.toggle());

    expect(loadVoiceAsset).toHaveBeenCalledWith("saved-voice");
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(TestAudio.instances[0].source).toBe("blob:recorded-voice");
    expect(TestAudio.instances[0].play).toHaveBeenCalledOnce();
    expect(playback.playing).toBe(true);

    await act(async () => playback.stop());

    expect(TestAudio.instances[0].pause).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:recorded-voice");
    expect(playback.playing).toBe(false);
  });
});
