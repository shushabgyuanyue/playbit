// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import type { BenefitIssuance } from "../data/types";
import { benefitShareData, isLocalShareUrl, shareLink } from "./linkSharing";

const pending: BenefitIssuance = { id: "issued", title: "请喝一杯", issuerName: "主持人", source: "promise", signature: [], status: "pending_claim", issuedAt: "2026-10-28T00:00:00Z", claimToken: "a/b" };
afterEach(() => vi.unstubAllGlobals());

it("only shares live, token-backed claim links", () => {
  expect(benefitShareData(pending)?.url).toBe(`${window.location.origin}/claim/a%2Fb`);
  expect(benefitShareData({ ...pending, claimToken: undefined })).toBeNull();
  expect(benefitShareData({ ...pending, status: "claimed" })).toBeNull();
  expect(benefitShareData({ ...pending, status: "unavailable" })).toBeNull();
});

it("handles native cancellation silently without copying", async () => {
  const writeText = vi.fn();
  vi.stubGlobal("navigator", { userAgent: "iPhone", share: vi.fn().mockRejectedValue(new DOMException("Cancelled", "AbortError")), clipboard: { writeText } });
  expect(await shareLink({ url: "https://example.test/claim/token" })).toBe("cancelled");
  expect(writeText).not.toHaveBeenCalled();
});

it("uses native sharing for supported public links on mobile", async () => {
  const share = vi.fn().mockResolvedValue(undefined);
  const writeText = vi.fn();
  vi.stubGlobal("navigator", { userAgent: "iPhone", share, canShare: () => true, clipboard: { writeText } });
  const data = { url: "https://example.test/share/record" };
  expect(await shareLink(data)).toBe("shared");
  expect(share).toHaveBeenCalledWith(data);
  expect(writeText).not.toHaveBeenCalled();
});

it("reports clipboard success only after the write completes", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", { clipboard: { writeText } });
  expect(await shareLink({ url: "https://example.test/claim/token" })).toBe("copied");
  expect(writeText).toHaveBeenCalledWith("https://example.test/claim/token");
  writeText.mockRejectedValueOnce(new Error("Permission denied"));
  await expect(shareLink({ url: "https://example.test/claim/token" })).rejects.toThrow("Permission denied");
});

it("does not report success when native sharing fails or sharing is unavailable", async () => {
  vi.stubGlobal("navigator", { userAgent: "Android", share: vi.fn().mockRejectedValue(new Error("Share failed")) });
  await expect(shareLink({ url: "https://example.test/claim/token" })).rejects.toThrow("Share failed");
  vi.stubGlobal("navigator", {});
  await expect(shareLink({ url: "https://example.test/claim/token" })).rejects.toThrow("unavailable");
});

it("copies immediately on desktop even when the native share sheet would never settle", async () => {
  const share = vi.fn(() => new Promise<void>(() => {}));
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", { userAgent: "Windows NT 10.0", share, clipboard: { writeText } });
  expect(await shareLink({ url: "https://example.test/share/record" })).toBe("copied");
  expect(share).not.toHaveBeenCalled();
  expect(writeText).toHaveBeenCalledWith("https://example.test/share/record");
});

it("keeps loopback preview links out of native sharing", async () => {
  const share = vi.fn();
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", { userAgent: "iPhone", share, clipboard: { writeText } });
  for (const origin of ["http://localhost:5174", "http://127.0.0.1:5174", "http://[::1]:5174"]) {
    const url = `${origin}/share/record`;
    expect(isLocalShareUrl(url)).toBe(true);
    expect(await shareLink({ url })).toBe("copied");
  }
  expect(share).not.toHaveBeenCalled();
  expect(isLocalShareUrl("https://playbit.whatmint.com/share/record")).toBe(false);
});

it("copies on mobile when the browser cannot share the payload", async () => {
  const share = vi.fn();
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", { userAgent: "Android", share, canShare: () => false, clipboard: { writeText } });
  expect(await shareLink({ url: "https://example.test/share/record" })).toBe("copied");
  expect(share).not.toHaveBeenCalled();
});
