<script setup lang="ts">
import { copy } from "@playbit/content";
import { Download, Link2, LoaderCircle, Share2, X } from "lucide-vue-next";
import type { ShareIntent, SharePayload } from "../composables/playbitFlowHelpers";
import { computed, ref, watch } from "vue";
import { useShareActions } from "../composables/useShareActions";
import { invitationCard } from "../services/invitationShare";
import BaseButton from "./ui/BaseButton.vue";

const props = withDefaults(defineProps<{
  show: boolean;
  payload: SharePayload | null;
  intent?: ShareIntent;
}>(), {
  intent: "general"
});

const emit = defineEmits<{
  "update:show": [show: boolean];
}>();

const panelTitle = computed(() => props.intent === "sign" ? copy.share.signPanelTitle
  : props.intent === "flip" ? copy.share.flipPanelTitle : props.intent === "game" ? copy.game.invite : copy.share.panelTitle);
const panelHint = computed(() => props.intent === "sign" ? copy.share.signPanelHint
  : props.intent === "flip" ? copy.share.flipPanelHint : props.intent === "game" ? copy.game.shareHint : copy.share.panelHint);
const { link, copying, feedback, copyLink } = useShareActions(computed(() => props.payload));
const qrImage = ref("");
const inviteFile = ref<File | null>(null);
const sharing = ref(false);
const qrLoading = ref(false);
const qrFailed = ref(false);
const retry = ref(0);
watch([() => props.show, link, retry], async ([show, url], _previous, onCleanup) => {
  let cancelled = false;
  onCleanup(() => { cancelled = true; });
  qrImage.value = "";
  inviteFile.value = null;
  qrFailed.value = false;
  qrLoading.value = false;
  feedback.value = "";
  if (!show) return;
  if (!url) { qrFailed.value = true; return; }
  qrLoading.value = true;
  try {
    if (!props.payload) throw new Error("Missing invitation");
    const card = await invitationCard(props.payload, panelTitle.value, panelHint.value);
    if (!cancelled) { qrImage.value = card.image; inviteFile.value = card.file; }
  } catch {
    if (!cancelled) qrFailed.value = true;
  } finally {
    if (!cancelled) qrLoading.value = false;
  }
}, { immediate: true });

async function shareImage() {
  if (!inviteFile.value || sharing.value) return;
  sharing.value = true;
  feedback.value = copy.share.nativeHint;
  try {
    const share = navigator.share;
    const canShareFiles = typeof share === "function" && (!navigator.canShare || navigator.canShare({ files: [inviteFile.value] }));
    if (canShareFiles) {
      await share.call(navigator, { files: [inviteFile.value], title: panelTitle.value });
    } else {
      const anchor = document.createElement("a");
      anchor.href = qrImage.value;
      anchor.download = inviteFile.value.name;
      anchor.click();
      feedback.value = copy.share.imageFallback;
    }
  } catch (error) {
    feedback.value = error instanceof Error && error.name === "AbortError" ? "" : copy.share.imageShareFailed;
  } finally { sharing.value = false; }
}
</script>

<template>
  <van-popup
    :show="show"
    round
    position="bottom"
    teleport="body"
    class="life-sheet-popup share-sheet-popup"
    role="dialog"
    aria-modal="true"
    :aria-label="panelTitle"
    @update:show="emit('update:show', $event)"
  >
    <section class="share-sheet">
      <header class="share-sheet-header">
        <div><h2>{{ panelTitle }}</h2><p>{{ panelHint }}</p></div>
        <button type="button" class="share-close" :aria-label="copy.common.close" @click="emit('update:show', false)">
          <X :size="19" aria-hidden="true" />
        </button>
      </header>

      <section class="share-invitation">
        <div class="share-invitation-heading"><strong>{{ copy.share.qrTitle }}</strong><span>{{ copy.share.faceToFace }}</span></div>
        <div class="share-qr share-invitation-preview" :aria-busy="qrLoading">
          <img v-if="qrImage" :src="qrImage" :alt="copy.share.imageAlt" width="720" height="1000" />
          <div v-else-if="qrLoading" class="share-qr-status" role="status">
            <LoaderCircle :size="22" class="life-button-spinner" aria-hidden="true" /><span>{{ copy.share.qrLoading }}</span>
          </div>
          <div v-else-if="qrFailed" class="share-qr-status" role="status">
            <span>{{ copy.share.qrFailed }}</span>
            <BaseButton size="sm" variant="ghost" :disabled="!link" @click="retry++">{{ copy.share.retry }}</BaseButton>
          </div>
        </div>
        <div class="share-qr-footer">
          <span>{{ copy.share.qrHint }}</span>
          <a v-if="qrImage" :href="qrImage" download="playbit-invitation.png" class="share-save">
            <Download :size="15" aria-hidden="true" />{{ copy.share.saveQr }}
          </a>
        </div>
      </section>

      <div class="share-channel-grid">
        <button type="button" class="share-channel share-channel-primary" :disabled="!inviteFile || sharing" @click="shareImage">
          <Share2 :size="20" aria-hidden="true" />
          <strong>{{ copy.share.channels.system }}</strong><small>{{ copy.share.systemAction }}</small>
        </button>
        <button type="button" class="share-channel" :disabled="!link || copying" @click="copyLink()">
          <Link2 :size="20" aria-hidden="true" />
          <strong>{{ copy.share.channels.copy }}</strong><small>{{ copy.share.copyAction }}</small>
        </button>
      </div>
      <p class="share-sheet-caption">{{ copy.share.nativeHint }}</p>
      <div v-if="feedback" class="share-feedback" role="status">
        <p>{{ feedback }}</p>
        <input v-if="link" :value="link" readonly :aria-label="copy.share.linkLabel" @focus="($event.target as HTMLInputElement).select()" />
      </div>
    </section>
  </van-popup>
</template>
