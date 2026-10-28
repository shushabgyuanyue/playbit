// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import type { BenefitIssuance } from "../data/types";
import { benefitShareData, shareLink } from "./linkSharing";

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
  vi.stubGlobal("navigator", { share: vi.fn().mockRejectedValue(new DOMException("Cancelled", "AbortError")), clipboard: { writeText } });
  expect(await shareLink({ url: "https://example.test/claim/token" })).toBe("cancelled");
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
  vi.stubGlobal("navigator", { share: vi.fn().mockRejectedValue(new Error("Share failed")) });
  await expect(shareLink({ url: "https://example.test/claim/token" })).rejects.toThrow("Share failed");
  vi.stubGlobal("navigator", {});
  await expect(shareLink({ url: "https://example.test/claim/token" })).rejects.toThrow("unavailable");
});
