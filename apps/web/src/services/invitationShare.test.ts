// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { invitationCard } from "./invitationShare";

vi.mock("qrcode", () => ({
  default: {
    toCanvas: vi.fn(async (canvas: HTMLCanvasElement, _value: string, options: { width: number }) => {
      canvas.width = options.width;
      canvas.height = options.width;
    })
  }
}));

class LoadedImage {
  naturalWidth = 600;
  naturalHeight = 120;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;

  set src(_value: string) {
    this.onload?.();
  }
}

const drawImage = vi.fn();
const fillText = vi.fn();
const context = {
  fillStyle: "",
  strokeStyle: "",
  lineWidth: 1,
  textAlign: "",
  font: "",
  drawImage,
  fillText,
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  measureText: (text: string) => ({ width: text.length * 38 })
} as unknown as CanvasRenderingContext2D;

beforeEach(() => {
  vi.stubGlobal("Image", LoadedImage);
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context);
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/png;base64,qr");
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) => {
    callback(new Blob(["invitation"], { type: "image/png" }));
  });
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:invitation");
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("invitation card layout", () => {
  it("keeps the QR square fixed and excludes pending status text from the image", async () => {
    const longTitle = "合同内容很长需要排版完整".repeat(8);
    const card = await invitationCard({
      title: longTitle,
      text: "待签署状态不应被绘制在邀请图片上",
      url: "https://playbit.example/share/ABCD"
    }, "转给乙方签署", "乙方扫码查看约定，签署后生效。");

    const qrDraw = drawImage.mock.calls.find(([, x]) => x === 150);
    expect(qrDraw).toEqual([expect.any(LoadedImage), 150, expect.any(Number), 420, 420]);
    expect(qrDraw?.[2]).toBeGreaterThanOrEqual(500);
    expect(fillText.mock.calls.some(([value]) => typeof value === "string" && value.endsWith("…"))).toBe(true);
    expect(fillText.mock.calls.map(([value]) => value)).not.toContain("待签署状态不应被绘制在邀请图片上");
    expect(card.image).toBe("blob:invitation");
    expect(card.file.type).toBe("image/png");
    expect(card.height).toBeGreaterThanOrEqual(1000);
  });
});
