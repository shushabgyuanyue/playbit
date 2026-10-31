// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useVoiceRecorder } from "./useVoiceRecorder";
import type { VoiceNote } from "../../data/types";
import { deleteVoiceAsset, saveVoiceAsset } from "../../services/voiceRepository";
import { playerApi } from "../../services/playerApi";

vi.mock("../../services/voiceRepository", () => ({ saveVoiceAsset: vi.fn(), deleteVoiceAsset: vi.fn() }));

class TestRecorder {
  static instances: TestRecorder[] = [];
  static isTypeSupported = (type: string) => type === "audio/webm;codecs=opus";
  state = "inactive";
  mimeType = "audio/webm;codecs=opus";
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(public stream: MediaStream, public options: MediaRecorderOptions) { TestRecorder.instances.push(this); }
  start() { this.state = "recording"; }
  stop() {
    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob(["compressed test audio"], { type: this.mimeType }) });
    this.onstop?.();
  }
}

describe("voice recorder lifecycle", () => {
  let root: Root;
  let host: HTMLDivElement;
  let recorder: ReturnType<typeof useVoiceRecorder>;
  let changed: ReturnType<typeof vi.fn<(voice: VoiceNote) => void>>;
  let getUserMedia: ReturnType<typeof vi.fn>;
  let stopTrack: ReturnType<typeof vi.fn>;
  let stream: MediaStream;
  let transcribeVoice: ReturnType<typeof vi.spyOn>;

  function Probe() { recorder = useVoiceRecorder(changed); return null; }

  beforeEach(async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("MediaRecorder", TestRecorder);
    stopTrack = vi.fn();
    stream = { getTracks: () => [{ stop: stopTrack }] } as unknown as MediaStream;
    getUserMedia = vi.fn().mockResolvedValue(stream);
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
    TestRecorder.instances = [];
    changed = vi.fn();
    vi.mocked(saveVoiceAsset).mockReset().mockResolvedValue(undefined);
    vi.mocked(deleteVoiceAsset).mockReset().mockResolvedValue(undefined);
    transcribeVoice = vi.spyOn(playerApi, "transcribeVoice").mockResolvedValue({ text: "输的人请喝一杯", requestId: "request-test" });
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    await act(async () => root.render(createElement(Probe)));
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
    transcribeVoice.mockRestore();
  });

  it("saves compressed audio only after stopping and releases the microphone", async () => {
    await act(async () => { await recorder.start(); });
    expect(recorder.status).toBe("recording");
    expect(changed).not.toHaveBeenCalled();
    expect(TestRecorder.instances[0].options).toEqual({ mimeType: "audio/webm;codecs=opus", audioBitsPerSecond: 32000 });
    await act(async () => recorder.stop());
    expect(saveVoiceAsset).toHaveBeenCalledOnce();
    expect(changed).toHaveBeenCalledWith(expect.objectContaining({ assetId: expect.stringMatching(/^voice_/), storage: "indexeddb", mimeType: "audio/webm;codecs=opus", byteLength: expect.any(Number) }));
    expect(stopTrack).toHaveBeenCalledOnce();
    expect(recorder.status).toBe("idle");
  });

  it("writes the ASR transcript back onto the saved voice", async () => {
    await act(async () => { await recorder.start(); });
    await act(async () => { recorder.stop(); await Promise.resolve(); await Promise.resolve(); });
    expect(transcribeVoice).toHaveBeenCalledOnce();
    expect(changed).toHaveBeenLastCalledWith(expect.objectContaining({ transcript: "输的人请喝一杯" }));
  });

  it("does not write a late transcript after the pending voice is cancelled", async () => {
    let resolveTranscription!: (value: { text: string; requestId: string | null }) => void;
    transcribeVoice.mockImplementation(() => new Promise(resolve => { resolveTranscription = resolve; }));
    await act(async () => { await recorder.start(); });
    await act(async () => { recorder.stop(); await Promise.resolve(); await Promise.resolve(); });
    expect(transcribeVoice).toHaveBeenCalledOnce();
    expect(changed).toHaveBeenCalledOnce();

    await act(async () => recorder.cancel());
    await act(async () => { resolveTranscription({ text: "不应该回写", requestId: "late" }); await Promise.resolve(); });

    expect(changed).toHaveBeenCalledOnce();
  });

  it("cancels a pending permission request and releases a late stream", async () => {
    let allow!: (value: MediaStream) => void;
    getUserMedia.mockImplementation(() => new Promise(resolve => { allow = resolve; }));
    let pending!: Promise<void>;
    await act(async () => { pending = recorder.start(); });
    await act(async () => recorder.cancel());
    await act(async () => { allow(stream); await pending; });
    expect(stopTrack).toHaveBeenCalledOnce();
    expect(TestRecorder.instances).toHaveLength(0);
    expect(recorder.status).toBe("idle");
    expect(changed).not.toHaveBeenCalled();
  });

  it("blocks duplicate starts and detaches callbacks when rerecording is cancelled", async () => {
    await act(async () => { await Promise.all([recorder.start(), recorder.start()]); });
    expect(getUserMedia).toHaveBeenCalledOnce();
    const previous = TestRecorder.instances[0];
    const lateError = previous.onerror!;
    await act(async () => recorder.cancel());
    expect(previous.onstop).toBeNull();
    expect(previous.ondataavailable).toBeNull();
    expect(previous.onerror).toBeNull();
    await act(async () => { await recorder.start(); lateError(); });
    expect(recorder.status).toBe("recording");
    expect(changed).not.toHaveBeenCalled();
    expect(saveVoiceAsset).not.toHaveBeenCalled();
  });

  it("keeps existing voice untouched after permission denial or storage failure", async () => {
    getUserMedia.mockRejectedValueOnce(new Error("Permission denied"));
    await act(async () => { await recorder.start(); });
    expect(recorder.status).toBe("error");
    expect(changed).not.toHaveBeenCalled();
    vi.mocked(saveVoiceAsset).mockRejectedValueOnce(new Error("Storage full"));
    await act(async () => { await recorder.start(); });
    await act(async () => recorder.stop());
    expect(recorder.status).toBe("error");
    expect(changed).not.toHaveBeenCalled();
    expect(stopTrack).toHaveBeenCalledOnce();
  });

  it("removes an unreferenced asset when the page is left during saving", async () => {
    let saved!: () => void;
    vi.mocked(saveVoiceAsset).mockImplementation(() => new Promise(resolve => { saved = resolve; }));
    await act(async () => { await recorder.start(); });
    await act(async () => recorder.stop());
    expect(recorder.status).toBe("saving");
    await act(async () => root.unmount());
    await act(async () => saved());
    expect(changed).not.toHaveBeenCalled();
    expect(deleteVoiceAsset).toHaveBeenCalledWith(vi.mocked(saveVoiceAsset).mock.calls[0][1]);
  });
});
