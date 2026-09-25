import { copy } from "@playbit/content";
import { showToast } from "vant";
import type { ComputedRef } from "vue";
import type { SharePayload } from "./playbitFlowHelpers";

export async function copyWithFeedback(text: string): Promise<boolean> {
  try {
    if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
    await navigator.clipboard.writeText(text);
    showToast(copy.share.copied);
    return true;
  } catch {
    showToast(copy.share.copyFailed);
    return false;
  }
}

export function useShareActions(sharePayload: ComputedRef<SharePayload | null>) {
  async function copyShareText() {
    if (!sharePayload.value) {
      return;
    }

    await copyWithFeedback(sharePayload.value.text);
  }

  async function nativeShare() {
    if (!sharePayload.value || !navigator.share) {
      await copyShareText();
      return;
    }

    try {
      await navigator.share(sharePayload.value);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
      await copyShareText();
    }
  }

  return {
    copyShareText,
    nativeShare
  };
}
