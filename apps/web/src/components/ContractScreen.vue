<script setup lang="ts">
import { copy } from "@playbit/content";
import type { Agreement } from "@playbit/shared";
import { ArrowRight, Download, RefreshCw, Share2 } from "lucide-vue-next";
import { computed, onUnmounted, ref } from "vue";
import AgreementProgress from "./AgreementProgress.vue";
import ContractDocument from "./ContractDocument.vue";
import LifeActionBar from "./ui/LifeActionBar.vue";
import LifeServiceHero from "./ui/LifeServiceHero.vue";
import BaseButton from "./ui/BaseButton.vue";
import { isCounterpartySigned } from "../utils/sessionDisplay";

const props = defineProps<{
  agreement: Agreement;
  currentUserId: string | null;
  refreshing?: boolean;
}>();

const emit = defineEmits<{
  back: [];
  home: [];
  start: [];
  refresh: [];
  openShare: [];
  openDocument: [action: "save" | "share"];
}>();

const signed = computed(() => isCounterpartySigned(props.agreement));
const isInitiator = computed(() =>
  props.agreement.participants.some(
    (participant) => participant.role === "initiator" && participant.userId === props.currentUserId
  )
);
const canSendForSignature = computed(() => isInitiator.value && !signed.value);
const localRefreshing = ref(false);
let refreshFeedbackTimer: number | undefined;
const isRefreshing = computed(() => Boolean(props.refreshing || localRefreshing.value));

function requestRefresh() {
  if (isRefreshing.value) {
    return;
  }
  localRefreshing.value = true;
  if (refreshFeedbackTimer) {
    window.clearTimeout(refreshFeedbackTimer);
  }
  refreshFeedbackTimer = window.setTimeout(() => {
    localRefreshing.value = false;
    refreshFeedbackTimer = undefined;
  }, 720);
  emit("refresh");
}

onUnmounted(() => {
  if (refreshFeedbackTimer) {
    window.clearTimeout(refreshFeedbackTimer);
  }
});
</script>

<template>
  <section class="life-page service-flow-page">
    <LifeServiceHero
      class="service-flow-hero"
      :title="copy.contract.navTitle"
      :show-back="true"
      :show-home="true"
      :back-label="copy.common.back"
      :home-label="copy.common.home"
      @back="emit('back')"
      @home="emit('home')"
    >
      <template #action>
        <button
          type="button"
          class="life-service-action"
          :aria-label="isRefreshing ? copy.contract.refreshing : copy.contract.refreshAction"
          :aria-busy="isRefreshing"
          :disabled="isRefreshing"
          @click="requestRefresh"
        >
          <RefreshCw :size="19" :class="{ spinning: isRefreshing }" />
        </button>
      </template>
    </LifeServiceHero>

    <div class="life-page-content service-flow-content">
      <AgreementProgress :agreement="props.agreement">
        <template #actions>
          <button
            v-if="signed"
            type="button"
            class="agreement-progress-action"
            :aria-label="copy.contract.documentSave"
            :title="copy.contract.documentSave"
            @click="emit('openDocument', 'save')"
          >
            <Download :size="17" aria-hidden="true" />
          </button>
        </template>
      </AgreementProgress>
      <ContractDocument :agreement="props.agreement" :reveal="true">
        <template #actions>
          <button
            v-if="canSendForSignature"
            type="button"
            class="contract-transfer-action"
            :aria-label="copy.contract.sendToCounterparty"
            @click="emit('openShare')"
          >
            <Share2 :size="16" aria-hidden="true" />
            <span>{{ copy.contract.sendToCounterparty }}</span>
          </button>
        </template>
      </ContractDocument>
    </div>

    <LifeActionBar v-if="signed">
      <BaseButton size="lg" :disabled="!signed" @click="emit('start')">
        <ArrowRight :size="18" />
        {{ signed ? copy.contract.enterSession : copy.contract.waiting }}
      </BaseButton>
    </LifeActionBar>

  </section>
</template>
