import { copy } from "@playbit/content";
import { showToast } from "vant";
import { computed, ref, watch, type ComputedRef } from "vue";
import type { SharePayload } from "./playbitFlowHelpers";
import { invitationUrl } from "../services/invitationShare";

export function useShareActions(payload: ComputedRef<SharePayload | null>) {
  const feedback = ref("");
  const copying = ref(false);
  const link = computed(() => invitationUrl(payload.value?.url));
  watch(link, () => { feedback.value = ""; });

  async function copyLink() {
    if (!link.value || copying.value) return;
    const currentLink = link.value;
    copying.value = true;
    try {
      await navigator.clipboard.writeText(currentLink);
      if (link.value !== currentLink) return;
      showToast(copy.share.copied);
    } catch {
      if (link.value === currentLink) feedback.value = copy.share.copyFailed;
    } finally {
      copying.value = false;
    }
  }

  return { link, copying, feedback, copyLink };
}
