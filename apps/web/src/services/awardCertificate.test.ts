// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAgreement, recordAgreementResult, signCounterparty } from "@playbit/game-core";
import type { CreateAgreementInput } from "@playbit/shared";
import { drawAwardCertificate } from "./awardCertificate";

const input: CreateAgreementInput = {
  source: "custom",
  title: "First to laugh",
  challenge: "First to laugh",
  creatorSignatureDataUrl: "data:image/png;base64,owner-signature",
  stake: { type: "coupon", label: "Tea", fulfilled: false, additions: [] }
};

class LoadedImage {
  naturalWidth = 600;
  naturalHeight = 120;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;

  set src(_value: string) {
    this.onload?.();
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("award certificate template fields", () => {
  it("uses the printed result row and places the recorder signature in its field", async () => {
    const drawImage = vi.fn();
    const fillText = vi.fn();
    const context = {
      drawImage,
      fillText,
      measureText: (text: string) => ({ width: text.length * 12 })
    } as unknown as CanvasRenderingContext2D;
    const canvas = document.createElement("canvas");
    Object.defineProperty(canvas, "getContext", { value: () => context });
    vi.stubGlobal("Image", LoadedImage);

    const owner = { id: "owner", nickname: "Owner" };
    const agreement = createAgreement(input, owner.id);
    const signed = signCounterparty(agreement, "Friend", "friend", "data:image/png;base64,friend-signature");
    const settled = recordAgreementResult(signed, signed.participants[0].id, owner.id);

    await drawAwardCertificate(canvas, settled, "result", owner.id);

    expect(fillText.mock.calls.map(([text]) => text)).not.toContain("胜出");
    expect(drawImage).toHaveBeenNthCalledWith(2, expect.any(LoadedImage), 423, 1086, 240, 48);
    expect(fillText).toHaveBeenCalledWith(expect.any(String), 423, 1165);
  });
});
