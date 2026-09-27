// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, computed, defineComponent, nextTick, type App } from "vue";
import { addBoost, confirmBoost, createAgreement, signCounterparty } from "@playbit/game-core";
import { copy } from "@playbit/content";
import type { Agreement } from "@playbit/shared";
import SessionScreen from "./SessionScreen.vue";

let app: App | undefined;
function sample() {
  const active = signCounterparty(createAgreement({ source: "custom", title: "First to laugh", creatorSignatureDataUrl: "signature",
    stake: { type: "custom", label: "Tea", fulfilled: false, additions: [] } }, "owner"), "Friend", "friend", "signature");
  return addBoost(active, active.participants[0].id, "Photos");
}
async function mount(agreement: Agreement, currentUserId: string, loading = false) {
  const withdraw = vi.fn();
  const root = document.createElement("div"); document.body.append(root);
  app = createApp(SessionScreen, { agreement, currentUserId, loading, coupons: [], onWithdrawBoost: withdraw });
  app.provide("playbit-authenticated", computed(() => true));
  app.component("van-popup", defineComponent({ props: ["show"], setup: (props, { slots }) => () => props.show ? slots.default?.() : null }));
  app.mount(root); await nextTick();
  return { root, withdraw };
}
function action(root: HTMLElement, text: string) {
  return [...root.querySelectorAll("button")].find(button => button.textContent?.trim() === text);
}
afterEach(() => { app?.unmount(); document.body.innerHTML = ""; });

describe("pending amendment controls", () => {
  it("lets the proposer withdraw directly without another confirmation step", async () => {
    const agreement = sample();
    const { root, withdraw } = await mount(agreement, "owner");
    root.querySelector<HTMLButtonElement>(".session-icon-action-withdraw")!.click();
    expect(withdraw).toHaveBeenCalledExactlyOnceWith(agreement.boosts[0].id);
    expect(root.querySelector(".session-icon-action-confirm")).toBeNull();
  });
  it("offers confirmation, not withdrawal, to the other participant", async () => {
    const { root } = await mount(sample(), "friend");
    expect(root.querySelector(".session-icon-action-withdraw")).toBeNull();
    expect(root.querySelector(".session-icon-action-confirm")).toBeDefined();
    expect(root.textContent).toContain(copy.session.boostPending);
  });
  it("removes withdrawal once both participants confirmed", async () => {
    const active = sample();
    const confirmed = confirmBoost(active, active.boosts[0].id, active.participants[1].id);
    const { root } = await mount(confirmed, "owner");
    expect(root.querySelector(".session-icon-action-withdraw")).toBeNull();
    expect(root.querySelector(".session-icon-action-confirm")).toBeNull();
    expect(root.querySelectorAll(".session-equity-grid .voucher-ticket")).toHaveLength(2);
  });
  it("blocks duplicate withdrawal while a mutation is in flight", async () => {
    const { root, withdraw } = await mount(sample(), "owner", true);
    const button = root.querySelector<HTMLButtonElement>(".session-icon-action-withdraw")!;
    expect(button.disabled).toBe(true); button.click();
    expect(withdraw).not.toHaveBeenCalled();
  });
});
