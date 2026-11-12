// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { shareAgreementImage } from "./agreementShareImage";

const context = {
  measureText: (value: string) => ({ width: [...value].length * 70 }),
  beginPath: vi.fn(), moveTo: vi.fn(), arcTo: vi.fn(), closePath: vi.fn(), fill: vi.fn(),
  fillRect: vi.fn(), fillText: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(), save: vi.fn(), restore: vi.fn()
} as unknown as CanvasRenderingContext2D;

describe("agreement image sharing", () => {
  const input = {
    text: "誰先笑出聲，誰就輸。",
    createdAt: "2026-11-12T12:00:00Z",
    signatures: { a: [], b: [] },
    participantNames: { a: "林", b: "TA" }
  };

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(callback => callback(new Blob(["png"], { type: "image/png" })));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("shares a real PNG file when the device accepts image sharing", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { share, canShare: () => true });

    await expect(shareAgreementImage(input)).resolves.toBe("shared");
    expect(share).toHaveBeenCalledOnce();
    expect(share.mock.calls[0]?.[0].files[0]).toMatchObject({ type: "image/png" });
    expect(context.fillText).toHaveBeenCalledWith("林", expect.any(Number), expect.any(Number), expect.any(Number));
    expect(context.fillText).toHaveBeenCalledWith("TA", expect.any(Number), expect.any(Number), expect.any(Number));
  });

  it("saves the share card when file sharing is unavailable", async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    const createObjectURL = vi.fn(() => "blob:agreement-card");
    vi.stubGlobal("navigator", {});
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL: vi.fn() });

    await expect(shareAgreementImage(input)).resolves.toBe("downloaded");
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
  });

  it("treats cancelling the native share sheet as a neutral outcome", async () => {
    vi.stubGlobal("navigator", {
      share: vi.fn().mockRejectedValue(new DOMException("Cancelled", "AbortError")),
      canShare: () => true
    });

    await expect(shareAgreementImage(input)).resolves.toBe("cancelled");
  });
});
