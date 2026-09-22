import { copy } from "@playbit/content";
import { showToast } from "vant";
import type { ComputedRef } from "vue";
import type { SharePayload } from "./playbitFlowHelpers";

export function useShareActions(sharePayload: ComputedRef<SharePayload | null>) {
  async function copyShareText() {
    if (!sharePayload.value) {
      return;
    }

    await navigator.clipboard?.writeText(sharePayload.value.text);
    showToast(copy.share.copied);
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
