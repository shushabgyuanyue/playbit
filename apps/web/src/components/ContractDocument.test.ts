// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { createApp, h, nextTick, type App } from "vue";
import { createAgreement } from "@playbit/game-core";
import type { CreateAgreementInput } from "@playbit/shared";
import { copy } from "@playbit/content";
import ContractDocument from "./ContractDocument.vue";

const input: CreateAgreementInput = {
  source: "custom",
  title: "First to laugh",
  challenge: "First to laugh",
  creatorSignatureDataUrl: "",
  stake: { type: "coupon", label: "Tea", fulfilled: false, additions: [] }
};

let app: App | undefined;
let root: HTMLDivElement | undefined;

afterEach(() => {
  app?.unmount();
  app = undefined;
  root?.remove();
  root = undefined;
});

describe("ContractDocument export", () => {
  it("keeps the live status on screen but excludes it from the shared image", async () => {
    const agreement = createAgreement(input, "owner");
    root = document.createElement("div");
    document.body.append(root);
    app = createApp({ render: () => h(ContractDocument, { agreement }) });
    app.mount(root);
    await nextTick();
    expect(root.querySelector(".contract-document-meta")?.textContent).toContain(copy.session.statuses[agreement.status]);
    app.unmount();

    root.replaceChildren();
    app = createApp({ render: () => h(ContractDocument, { agreement, exporting: true }) });
    app.mount(root);
    await nextTick();
    expect(root.querySelector(".contract-document-meta .life-badge")).toBeNull();
  });
});
