import type { BenefitIssuance } from "../data/types";

export function benefitShareData(issuance: BenefitIssuance | null, description = ""): ShareData | null {
  if (!issuance?.claimToken || issuance.status !== "pending_claim") return null;
  return {
    title: issuance.title,
    text: description ? `${description} · ${issuance.title}` : issuance.title,
    url: `${window.location.origin}/claim/${encodeURIComponent(issuance.claimToken)}`
  };
}

export function isLocalShareUrl(url: string) {
  return ["localhost", "127.0.0.1", "[::1]"].includes(new URL(url, window.location.origin).hostname);
}

export async function shareLink(data: ShareData): Promise<"shared" | "copied" | "cancelled"> {
  if (!data.url) throw new Error("Missing share URL");
  const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  // Desktop share sheets can block on URL previews; copying does not depend on that UI.
  if (mobile && !isLocalShareUrl(data.url) && navigator.share && (!navigator.canShare || navigator.canShare(data))) {
    try {
      await navigator.share(data);
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
      throw error;
    }
  }
  if (!navigator.clipboard?.writeText) throw new Error("Link sharing unavailable");
  await navigator.clipboard.writeText(data.url);
  return "copied";
}
