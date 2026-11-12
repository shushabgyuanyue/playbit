// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { playerCopy as copy } from "@playbit/content/player";
import { PromiseProgress } from "./PromiseProgress";

it("shows benefit settlement as the final promise flow step", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  try {
    await act(async () => root.render(createElement(PromiseProgress, { activeStep: 2, onRestart: vi.fn() })));
    expect(host.querySelector(".promise-progress-heading")?.textContent).toContain(copy.promise.steps.at(-1));
    expect(copy.promise.steps).toHaveLength(3);
    expect(host.querySelector(".promise-progress-heading > span")?.textContent).toBe(copy.promise.stepCount(3, 3));
    expect(host.querySelectorAll(".promise-progress-track .active")).toHaveLength(3);
  } finally {
    await act(async () => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
  }
});

afterEach(() => vi.restoreAllMocks());
