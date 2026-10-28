// @vitest-environment happy-dom
import { act, createElement, useState } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { emptyDraft } from "../../data/demo";
import type { VoiceNote } from "../../data/types";
import { PromiseForm } from "./PromiseForm";

vi.mock("./VoiceRecorderButton", () => ({ VoiceRecorderButton: ({ onChange, onBusyChange, label, voice }: { onChange: (voice: VoiceNote) => void; onBusyChange: (busy: boolean) => void; label: string; voice: VoiceNote }) => createElement("div", null,
  createElement("button", { type: "button", onClick: () => onChange({ ...voice, assetId: label, durationMs: 1000 }) }, `录制${label}`),
  createElement("button", { type: "button", onClick: () => onBusyChange(true) }, "开始重录"),
  createElement("button", { type: "button", onClick: () => onBusyChange(false) }, "取消重录")) }));

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

it("locks steps and submission during inline rerecording, then restores the saved draft on cancel", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const onContinue = vi.fn();
  const draft = emptyDraft();
  draft.challengeVoice.assetId = "saved-challenge";
  draft.benefitVoice.assetId = "saved-benefit";
  try {
    await act(async () => root.render(createElement(PromiseForm, { draft, onContinue, onVoiceChange: vi.fn() })));
    const action = () => host.querySelector<HTMLButtonElement>(".contract-cta")!;
    const buttons = () => Array.from(host.querySelectorAll<HTMLButtonElement>("button"));
    expect(action().disabled).toBe(false);
    await act(async () => buttons().find(button => button.textContent === "开始重录")!.click());
    expect(action().disabled).toBe(true);
    expect(Array.from(host.querySelectorAll<HTMLButtonElement>('[role="tab"]')).every(button => button.disabled)).toBe(true);
    await act(async () => host.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
    expect(onContinue).not.toHaveBeenCalled();
    await act(async () => buttons().find(button => button.textContent === "取消重录")!.click());
    expect(action().disabled).toBe(false);
    await act(async () => action().click());
    expect(onContinue).toHaveBeenCalledOnce();
    expect(draft.challengeVoice.assetId).toBe("saved-challenge");
  } finally {
    await act(async () => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
  }
});
