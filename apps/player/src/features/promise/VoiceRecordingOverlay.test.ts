// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OverlayContainer } from "../../components/ui/Sheet";
import { VoiceRecordingOverlay } from "./VoiceRecordingOverlay";

describe("voice recording overlay", () => {
  let root: Root;
  let host: HTMLDivElement;
  let phone: HTMLDivElement;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    host = document.createElement("div");
    phone = document.createElement("div");
    document.body.append(host, phone);
    root = createRoot(host);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    phone.remove();
    vi.unstubAllGlobals();
  });

  it("renders the status into the app screen container", async () => {
    await act(async () => root.render(createElement(OverlayContainer.Provider, { value: phone },
      createElement(VoiceRecordingOverlay, { open: true, arming: false, label: "赌约原声", recordingLabel: "正在录音" }))));

    const overlay = phone.querySelector<HTMLElement>(".voice-recording-overlay");
    expect(overlay?.getAttribute("aria-label")).toBe("正在录音");
    expect(overlay?.textContent).toContain("正在录音");
    expect(host.querySelector(".voice-recording-overlay")).toBeNull();
  });
});
