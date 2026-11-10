// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { emptyDraft } from "../../data/demo";
import { PromiseForm } from "./PromiseForm";

it("requires one saved agreement voice before continuing to signatures", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const onContinue = vi.fn();
  const draft = emptyDraft();
  try {
    await act(async () => root.render(createElement(PromiseForm, { draft, onContinue })));
    const action = () => host.querySelector<HTMLButtonElement>(".contract-cta")!;
    expect(action().disabled).toBe(true);
    expect(host.querySelector("[role=\"tabpanel\"]")).toBeNull();
    expect(host.querySelector("aside button")).toBeNull();
    draft.voice = { ...draft.voice, assetId: "saved-voice", durationMs: 1000 };
    await act(async () => root.render(createElement(PromiseForm, { draft, onContinue })));
    await act(async () => action().click());
    expect(onContinue).toHaveBeenCalledOnce();
  } finally {
    await act(async () => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
  }
});

it("keeps the creation form free of a second recorder", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const onContinue = vi.fn();
  const draft = emptyDraft();
  draft.voice.assetId = "saved-voice";
  try {
    await act(async () => root.render(createElement(PromiseForm, { draft, onContinue })));
    const action = () => host.querySelector<HTMLButtonElement>(".contract-cta")!;
    expect(action().disabled).toBe(false);
    expect(host.querySelector(".voice-recorder")).toBeNull();
    await act(async () => action().click());
    expect(onContinue).toHaveBeenCalledOnce();
  } finally {
    await act(async () => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
  }
});
