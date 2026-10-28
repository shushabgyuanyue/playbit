// @vitest-environment happy-dom
import { act, createElement, useState } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { emptyDraft } from "../../data/demo";
import type { VoiceNote } from "../../data/types";
import { PromiseForm } from "./PromiseForm";

vi.mock("./VoiceRecorderButton", () => ({ VoiceRecorderButton: ({ onChange, label, voice }: { onChange: (voice: VoiceNote) => void; label: string; voice: VoiceNote }) => createElement("button", { type: "button", onClick: () => onChange({ ...voice, assetId: label, durationMs: 1000 }) }, `录制${label}`) }));

it("records each part in one workspace before continuing to signatures", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const onContinue = vi.fn();
  function Harness() {
    const [draft, setDraft] = useState(emptyDraft);
    return createElement(PromiseForm, { draft, onContinue, onVoiceChange: (kind, voice) => setDraft(current => ({ ...current, [kind === "challenge" ? "challengeVoice" : "benefitVoice"]: voice })) });
  }
  try {
    await act(async () => root.render(createElement(Harness)));
    const action = () => host.querySelector<HTMLButtonElement>(".contract-cta")!;
    const record = () => host.querySelector<HTMLButtonElement>('[role="tabpanel"] button')!;
    expect(action().disabled).toBe(true);
    expect(host.querySelectorAll('[role="tabpanel"]')).toHaveLength(1);
    expect(host.querySelector("aside button")).toBeNull();
    await act(async () => record().click());
    await act(async () => action().click());
    expect(onContinue).not.toHaveBeenCalled();
    expect(host.querySelector("h3")?.textContent).toBe("赢了拿什么");
    expect(action().disabled).toBe(true);
    expect(host.querySelector("aside button")).toBeNull();
    await act(async () => record().click());
    await act(async () => action().click());
    expect(onContinue).toHaveBeenCalledOnce();
    await act(async () => host.querySelectorAll<HTMLButtonElement>('[role="tab"]')[0]!.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true })));
    expect(host.querySelector('[role="tab"][aria-selected="true"]')?.getAttribute("data-kind")).toBe("benefit");
  } finally {
    await act(async () => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
  }
});
