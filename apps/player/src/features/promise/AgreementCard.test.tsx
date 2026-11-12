// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { playerCopy as copy } from "@playbit/content/player";
import { AgreementCard } from "./AgreementCard";

const playback = vi.hoisted(() => ({ toggle: vi.fn(), playing: false, loading: false, error: "" }));

vi.mock("./useVoicePlayback", () => ({ useVoicePlayback: () => playback }));

describe("agreement share card", () => {
  let root: ReturnType<typeof createRoot>;
  let host: HTMLDivElement;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    playback.toggle.mockReset();
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("puts the shared promise and both signatures ahead of document metadata", async () => {
    const voice = { id: "voice", durationMs: 1200, storage: "demo" as const, assetId: "audio" };
    await act(async () => root.render(createElement(AgreementCard, {
      text: "誰先笑出聲，誰就輸。",
      voice,
      status: copy.promise.shareCard.signed,
      createdAt: "2026-11-12T12:00:00.000Z",
      participants: [
        { role: "initiator", nickname: "林", signed: true, signature: [[{ x: 0.1, y: 0.5 }, { x: 0.9, y: 0.5 }]] },
        { role: "counterparty", nickname: "TA", signed: true, signature: [[{ x: 0.1, y: 0.5 }, { x: 0.9, y: 0.5 }]] }
      ]
    })));

    expect(host.querySelector(".agreement-card-head")?.textContent).toContain(copy.promise.shareCard.brand);
    expect(host.querySelector(".agreement-card-challenge h1")?.textContent).toBe("誰先笑出聲，誰就輸。");
    expect(host.querySelectorAll(".agreement-card-participant .signature-mark")).toHaveLength(2);
    expect(host.querySelectorAll(".agreement-card-person b")).toHaveLength(2);
    expect(host.querySelector(".agreement-card-person b")?.textContent).toBe("林");
    expect(host.querySelector(".agreement-audio-label")).toBeNull();
    expect(host.querySelector(".agreement-card-footer")?.textContent).toContain(copy.promise.shareCard.keepTogether);
    expect(host.querySelector(".agreement-tear-hint")).toBeNull();
    expect(host.querySelector(".agreement-card-challenge p")).toBeNull();
    expect(host.textContent).not.toContain("#");
  });

  it("keeps signing status with each signature pad instead of repeating a card status", async () => {
    await act(async () => root.render(createElement(AgreementCard, {
      text: "誰先笑出聲，誰就輸。",
      voice: { id: "voice", durationMs: 0, storage: "demo" as const },
      status: copy.promise.shareCard.readyToSeal,
      signatureArea: createElement("div", { className: "signature-test" }, "双人签名")
    })));

    expect(host.querySelector(".agreement-card-head")?.textContent).toContain(copy.promise.shareCard.brand);
    expect(host.querySelector(".agreement-card-head")?.textContent).not.toContain(copy.promise.shareCard.readyToSeal);
    expect(host.querySelector(".signature-test")?.textContent).toBe("双人签名");
  });
});
