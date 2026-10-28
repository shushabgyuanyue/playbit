import type { BenefitIssuance } from "../data/types";

export function benefitShareData(issuance: BenefitIssuance | null, description = ""): ShareData | null {
  if (!issuance?.claimToken || issuance.status !== "pending_claim") return null;
  return {
    title: issuance.title,
    text: description ? `${description} · ${issuance.title}` : issuance.title,
    url: `${window.location.origin}/claim/${encodeURIComponent(issuance.claimToken)}`
  };
}

export async function shareLink(data: ShareData): Promise<"shared" | "copied" | "cancelled"> {
  if (!data.url) throw new Error("Missing share URL");
  if (navigator.share) {
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
