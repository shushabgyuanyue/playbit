// @vitest-environment happy-dom
import { act, createElement, useState, type Dispatch, type SetStateAction } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { createInitialState } from "../../data/demo";
import type { PlayerState } from "../../data/types";
import { PlayerApiError } from "../../services/playerApi";
import { useIssuanceAvailability } from "./useIssuanceAvailability";

const mocks = vi.hoisted(() => ({ preview: vi.fn() }));
vi.mock("../../services/playerApi", () => ({ isPlayerApiConfigured: () => true, PlayerApiError: class extends Error { constructor(message: string, readonly status: number) { super(message); } }, playerApi: { getCouponShare: mocks.preview } }));

async function mount() {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const host = document.createElement("div");
  const root = createRoot(host);
  let update!: Dispatch<SetStateAction<PlayerState>>;
  function Consumer() {
    const [state, setState] = useState(() => {
      const initial = createInitialState();
      initial.issuedBenefits.pending = { id: "pending", claimToken: "token", title: "请喝一杯", source: "direct", signature: [], issuerName: "甲", issuedAt: "2026-10-28T00:00:00Z", status: "pending_claim" };
      return initial;
    });
    update = setState;
    useIssuanceAvailability(state, setState);
    return createElement("span", null, state.issuedBenefits.pending!.status);
  }
  await act(async () => root.render(createElement(Consumer)));
  return { host, update, close: async () => { await act(async () => root.unmount()); vi.unstubAllGlobals(); } };
}

it("closes exhausted links but leaves transient network failures pending", async () => {
  mocks.preview.mockRejectedValueOnce(new PlayerApiError("Unavailable", 410));
  const first = await mount();
  try { expect(first.host.textContent).toBe("unavailable"); } finally { await first.close(); }
  mocks.preview.mockRejectedValueOnce(new PlayerApiError("Network", 0));
  const second = await mount();
  try { expect(second.host.textContent).toBe("pending_claim"); } finally { await second.close(); }
});

it("does not overwrite a successful self-claim with a late availability response", async () => {
  let reject!: (error: Error) => void;
  mocks.preview.mockReturnValueOnce(new Promise((_, fail) => { reject = fail; }));
  const view = await mount();
  try {
    await act(async () => view.update(current => ({ ...current, issuedBenefits: { ...current.issuedBenefits, pending: { ...current.issuedBenefits.pending!, status: "claimed" } } })));
    await act(async () => reject(new PlayerApiError("Unavailable", 410)));
    expect(view.host.textContent).toBe("claimed");
  } finally { await view.close(); }
});
