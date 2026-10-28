// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RevealVoiceSeal } from "./RevealVoiceSeal";
import type { VoiceNote } from "../../data/types";

const playback = vi.hoisted(() => ({ playing: false, loading: false, error: "", toggle: vi.fn(), stop: vi.fn() }));
vi.mock("./useVoicePlayback", () => ({ useVoicePlayback: () => playback }));

describe("reward audio tear seal", () => {
  let root: Root;
  let host: HTMLDivElement;
  let seal: HTMLButtonElement;
  const voice: VoiceNote = { id: "test", assetId: "audio-test", storage: "indexeddb", durationMs: 3000 };

  async function mount(note = voice) {
    await act(async () => root.render(createElement(RevealVoiceSeal, { voice: note, benefit: "请吃火锅" })));
    seal = host.querySelector(".voice-tear-seal")!;
    Object.defineProperty(seal, "clientWidth", { value: 150 });
    seal.setPointerCapture = vi.fn();
    seal.hasPointerCapture = () => false;
  }

  async function pointer(type: string, x: number, id = 1) {
    await act(async () => seal.dispatchEvent(new PointerEvent(type, { bubbles: true, button: 0, pointerId: id, clientX: x })));
  }

  beforeEach(async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    playback.toggle.mockReset();
    playback.error = "";
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    await mount();
  });

  afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); });

  it("hides the reward and playback from focus before reveal", () => {
    expect(host.querySelector(".reward-audio-content")?.getAttribute("aria-hidden")).toBe("true");
    expect(host.querySelector(".reward-audio-content")?.hasAttribute("inert")).toBe(true);
    expect(playback.toggle).not.toHaveBeenCalled();
  });

  it("snaps a short or reversed drag back without a trailing click opening it", async () => {
    await pointer("pointerdown", 100);
    await pointer("pointermove", 130);
    await pointer("pointermove", 100);
    await pointer("pointerup", 100);
    await act(async () => seal.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 })));
    expect(seal.getAttribute("aria-expanded")).toBe("false");
    expect(seal.style.getPropertyValue("--tear-x")).toBe("0px");
    expect(playback.toggle).not.toHaveBeenCalled();
  });

  it("reveals on a complete drag and starts audio exactly once", async () => {
    await pointer("pointerdown", 100);
    await pointer("pointermove", 185);
    expect(seal.style.getPropertyValue("--tear-x")).toBe("85px");
    await pointer("pointerup", 185);
    await act(async () => seal.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 })));
    expect(seal.getAttribute("aria-expanded")).toBe("true");
    expect(playback.toggle).toHaveBeenCalledOnce();
  });

  it("supports leftward tearing but cancels an interrupted gesture", async () => {
    await pointer("pointerdown", 200);
    await pointer("pointermove", 100);
    await pointer("pointercancel", 100);
    expect(seal.getAttribute("aria-expanded")).toBe("false");
    await pointer("pointerdown", 200);
    await pointer("pointerup", 100);
    expect(seal.getAttribute("aria-expanded")).toBe("true");
    expect(playback.toggle).toHaveBeenCalledOnce();
  });

  it("ignores a second pointer and releases on lost capture", async () => {
    await pointer("pointerdown", 100);
    await pointer("pointerup", 250, 2);
    expect(playback.toggle).not.toHaveBeenCalled();
    await pointer("lostpointercapture", 250);
    expect(seal.getAttribute("aria-expanded")).toBe("false");
  });

  it("supports keyboard activation, moves focus and keeps retry available on playback error", async () => {
    seal.focus();
    playback.error = "播放失败";
    await act(async () => seal.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 0 })));
    expect(seal.getAttribute("aria-expanded")).toBe("true");
    expect(document.activeElement).toBe(host.querySelector(".agreement-audio-play"));
    expect(host.querySelector('[role="alert"]')?.textContent).toBe("播放失败");
    await act(async () => host.querySelector<HTMLButtonElement>(".agreement-audio-play")!.click());
    expect(playback.toggle).toHaveBeenCalledTimes(2);
  });

  it("reveals legacy text without pretending a recording exists", async () => {
    await mount({ ...voice, assetId: undefined });
    await act(async () => seal.click());
    expect(host.querySelector(".reward-audio-content")?.getAttribute("aria-hidden")).toBe("false");
    expect(host.querySelector<HTMLButtonElement>(".agreement-audio-play")?.disabled).toBe(true);
    expect(playback.toggle).not.toHaveBeenCalled();
  });
});
