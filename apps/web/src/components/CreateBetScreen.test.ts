// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, nextTick, type App } from "vue";
import { copy } from "@playbit/content";
import type { Stake } from "@playbit/shared";
import CreateBetScreen from "./CreateBetScreen.vue";
import StakePicker from "./StakePicker.vue";

vi.mock("./ui/SignaturePad.vue", () => ({ default: defineComponent({ setup: () => () => h("div", { "data-signature": true }) }) }));
vi.mock("./ui/AgreementNotice.vue", () => ({ default: defineComponent({ setup: () => () => null }) }));
let app: App | undefined;
function mount(component: Parameters<typeof createApp>[0], props: Record<string, unknown>) {
  const node = document.createElement("div"); document.body.append(node);
  app = createApp(component, props);
  app.provide("playbit-authenticated", false);
  app.component("van-popup", defineComponent({ props: ["show"], setup: (props, { slots }) => () => props.show ? slots.default?.() : null }));
  app.mount(node);
  return node;
}
afterEach(() => { app?.unmount(); document.body.innerHTML = ""; });
describe("contract form validation", () => {
  it("keeps empty custom equity empty instead of submitting its placeholder", async () => {
    const changes: Stake[] = [];
    mount(StakePicker, { modelValue: { type: "custom", label: "", fulfilled: false, additions: [] }, onChange: (stake: Stake) => changes.push(stake) });
    await nextTick(); expect(changes.at(-1)?.label).toBe("");
  });
  it.each(["", "   "])("does not open signature confirmation for blank custom equity %j", async label => {
    const submit = vi.fn();
    const node = mount(CreateBetScreen, { draft: { title: "First to laugh", stake: { type: "custom", label, fulfilled: false, additions: [] }, creatorSignatureDataUrl: "signature" }, user: null, onSubmit: submit });
    await nextTick();
    const next = [...node.querySelectorAll("button")].find(button => button.textContent?.includes(copy.create.nextStep))!;
    next.click(); await nextTick();
    expect(node.textContent).toContain(copy.create.stakeRequired);
    expect(node.querySelector("[data-signature]")).toBeNull();
    expect(submit).not.toHaveBeenCalled();
    expect(node.querySelector("textarea")?.maxLength).toBe(50);
    expect(node.querySelector("input")?.maxLength).toBe(20);
  });
});
