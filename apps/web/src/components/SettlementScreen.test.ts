// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, nextTick, type App, type PropType } from "vue";
import { createAgreement, recordAgreementResult, signCounterparty } from "@playbit/game-core";
import type { Agreement, CreateAgreementInput, User } from "@playbit/shared";

vi.mock("./CertificateScreen.vue", async () => {
    const { defineComponent: component, h: node, onMounted: mounted } = await import("vue");
    return {
      default: component({
        props: {
          agreement: { type: Object as PropType<Agreement>, required: true },
          currentUserId: { type: String, required: true }
        },
        setup(props, { emit }) {
        mounted(() => emit("rendered", `${props.agreement.id}:${props.agreement.revision}:${props.currentUserId ?? ""}`));
        return () => node("canvas", { "data-certificate": true });
      }
    })
  };
});

import SettlementScreen from "./SettlementScreen.vue";

const owner: User = { id: "owner", nickname: "Owner", email: "owner@example.com", createdAt: "2026-09-27", signatureDataUrl: null, avatarDataUrl: null };
const friend: User = { ...owner, id: "friend", nickname: "Friend" };
const input: CreateAgreementInput = {
  source: "custom",
  title: "First to laugh",
  challenge: "First to laugh",
  creatorSignatureDataUrl: "signature",
  stake: { type: "coupon", label: "Tea", fulfilled: false, additions: [] }
};
const active = signCounterparty(createAgreement(input, owner.id), friend.nickname, friend.id, "signature");
const settled = recordAgreementResult(active, active.participants[0].id, owner.id);

let app: App | undefined;
let originalMatchMedia: typeof window.matchMedia;

function mount(revealId: string | null, onRevealComplete = vi.fn()) {
  const node = document.createElement("div");
  document.body.append(node);
  app = createApp(SettlementScreen, {
    agreement: settled,
    currentUserId: owner.id,
    revealId,
    onRevealComplete
  });
  app.mount(node);
  return { node, onRevealComplete };
}

beforeEach(() => {
  originalMatchMedia = window.matchMedia;
  window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia;
});
afterEach(() => {
  app?.unmount();
  document.body.innerHTML = "";
  window.matchMedia = originalMatchMedia;
  vi.restoreAllMocks();
});

describe("settlement certificate reveal", () => {
  it("starts once after the certificate has rendered", async () => {
    const { node, onRevealComplete } = mount("new-result");
    await nextTick();
    expect(node.querySelector(".certificate-award-stage")?.classList.contains("is-awarding")).toBe(true);
    expect(onRevealComplete).toHaveBeenCalledTimes(1);
    expect(onRevealComplete).toHaveBeenCalledWith("new-result");
  });

  it("acknowledges without animation when reduced motion is enabled", async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
    const { node, onRevealComplete } = mount("new-result");
    await nextTick();
    expect(node.querySelector(".certificate-award-stage")?.classList.contains("is-awarding")).toBe(false);
    expect(onRevealComplete).toHaveBeenCalledTimes(1);
  });

  it("keeps a historical certificate static", async () => {
    const { node, onRevealComplete } = mount(null);
    await nextTick();
    expect(node.querySelector(".certificate-award-stage")?.classList.contains("is-awarding")).toBe(false);
    expect(onRevealComplete).not.toHaveBeenCalled();
  });
});
