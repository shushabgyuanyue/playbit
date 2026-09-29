<script setup lang="ts">
import { copy } from "@playbit/content";
import { hasCouponEquity } from "@playbit/game-core";
import type { Agreement } from "@playbit/shared";
import { CheckCircle2, ChevronRight, Share2 } from "lucide-vue-next";
import { computed, onUnmounted, ref, watch } from "vue";
import BaseButton from "./ui/BaseButton.vue";
import CertificateScreen from "./CertificateScreen.vue";
import LifeActionBar from "./ui/LifeActionBar.vue";
import LifeServiceHero from "./ui/LifeServiceHero.vue";

type CertificateActions = {
  busy: boolean;
  saveCertificate: () => Promise<boolean>;
  shareCertificate: () => Promise<boolean>;
};

const props = defineProps<{
  agreement: Agreement;
  currentUserId: string | null;
  showBack?: boolean;
  revealId?: string | null;
}>();

const emit = defineEmits<{
  back: [];
  home: [];
  openVouchers: [];
  revealComplete: [revealId: string];
}>();

const certificateRef = ref<CertificateActions | null>(null);
const isAwarding = ref(false);
let renderedCertificateKey: string | null = null;
let playedRevealId: string | null = null;
let revealTimer: number | null = null;

function certificateKey() {
  return `${props.agreement.id}:${props.agreement.revision}:${props.currentUserId ?? ""}`;
}

function beginCertificateReveal() {
  const revealId = props.revealId;
  if (!revealId || playedRevealId === revealId || renderedCertificateKey !== certificateKey()) return;
  playedRevealId = revealId;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    emit("revealComplete", revealId);
    return;
  }
  isAwarding.value = true;
  emit("revealComplete", revealId);
  if (revealTimer !== null) window.clearTimeout(revealTimer);
  revealTimer = window.setTimeout(() => {
    isAwarding.value = false;
    revealTimer = null;
  }, 900);
}

function onCertificateRendered(renderKey: string) {
  if (renderKey !== certificateKey()) return;
  renderedCertificateKey = certificateKey();
  beginCertificateReveal();
}

watch(
  () => [props.agreement.id, props.agreement.revision, props.currentUserId],
  () => {
    renderedCertificateKey = null;
    isAwarding.value = false;
    if (revealTimer !== null) window.clearTimeout(revealTimer);
    revealTimer = null;
  }
);
watch(() => props.revealId, beginCertificateReveal);
onUnmounted(() => {
  if (revealTimer !== null) window.clearTimeout(revealTimer);
});

const fulfilled = computed(() => props.agreement.status === "fulfilled" || props.agreement.stake.fulfilled);
const waived = computed(() => props.agreement.status === "waived");
const isCouponStake = computed(() => hasCouponEquity(props.agreement));
const issueTitle = computed(() => {
  if (isCouponStake.value) return copy.settlement.voucherIssued;
  return copy.settlement.pointRecorded;
});
const issueHint = computed(() => {
  if (isCouponStake.value) {
    return fulfilled.value || waived.value ? copy.settlement.voucherArchivedHint : copy.settlement.voucherIssuedHint;
  }
  return copy.settlement.pointRecordedHint;
});
const certificateBusy = computed(() => certificateRef.value?.busy ?? false);

async function saveAndShare() {
  const certificate = certificateRef.value;
  if (!certificate) return;
  await certificate.shareCertificate();
}
</script>

<template>
  <section class="life-page service-flow-page settlement-page">
    <LifeServiceHero
      class="service-flow-hero"
      :title="copy.settlement.navTitle"
      :show-back="props.showBack"
      :show-home="true"
      :back-label="copy.common.back"
      :home-label="copy.common.home"
      @back="emit('back')"
      @home="emit('home')"
    />

    <div class="life-page-content service-flow-content">
      <section
        class="settlement-certificate-panel"
        :aria-label="copy.certificate.resultTitle"
      >
        <div class="certificate-award-stage" :class="{ 'is-awarding': isAwarding }">
          <CertificateScreen
            ref="certificateRef"
            :agreement="props.agreement"
            :flip="null"
            kind="result"
            :current-user-id="currentUserId"
            :embedded="true"
            @rendered="onCertificateRendered"
          />
        </div>
      </section>

      <section v-if="isCouponStake" class="settlement-asset-panel" aria-live="polite">
        <div class="settlement-asset-copy">
          <span class="settlement-asset-kicker"><CheckCircle2 :size="15" aria-hidden="true" />{{ issueTitle }}</span>
          <p>{{ issueHint }}</p>
        </div>
        <button type="button" class="settlement-asset-link" @click="emit('openVouchers')">
          <span>{{ copy.settlement.openVouchers }}</span>
          <ChevronRight :size="17" aria-hidden="true" />
        </button>
      </section>

      <section v-else class="life-panel settlement-fulfillment-panel">
        <h2 class="life-section-title">{{ issueTitle }}</h2>
        <p class="life-section-caption">{{ issueHint }}</p>
      </section>
    </div>

    <LifeActionBar>
      <BaseButton class="settlement-certificate-action" size="lg" :loading="certificateBusy" @click="saveAndShare">
        <Share2 :size="18" />
        {{ copy.settlement.downloadAndShare }}
      </BaseButton>
    </LifeActionBar>
  </section>
</template>

<style scoped>
.certificate-award-stage {
  position: relative;
  width: min(100%, 420px);
  margin: 0 auto;
}

.certificate-award-stage.is-awarding :deep(.certificate-preview) {
  animation: certificate-paper-award 620ms cubic-bezier(.2, .76, .26, 1) both;
}

.certificate-award-stage.is-awarding::after {
  position: absolute;
  top: 87.7%;
  left: 86.7%;
  width: 20%;
  aspect-ratio: 1;
  border: 2px double rgba(166, 55, 57, .46);
  border-radius: 50%;
  background: radial-gradient(circle, rgba(166, 55, 57, .08) 0 52%, transparent 58%);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .24), 0 1px 2px rgba(80, 25, 26, .12);
  content: "";
  pointer-events: none;
  animation: certificate-seal-press 620ms cubic-bezier(.18, .8, .24, 1.08) 130ms both;
}

@keyframes certificate-paper-award {
  0% { opacity: 0; filter: blur(1px); transform: translateY(12px) scale(.985); }
  72% { opacity: 1; filter: blur(0); transform: translateY(-1px) scale(1.002); }
  100% { opacity: 1; filter: none; transform: none; }
}

@keyframes certificate-seal-press {
  0% { opacity: 0; transform: translate(-50%, -50%) scale(1.65) rotate(-14deg); }
  48% { opacity: .5; transform: translate(-50%, -50%) scale(.88) rotate(-8deg); }
  72% { opacity: .24; transform: translate(-50%, -50%) scale(1.04) rotate(-10deg); }
  100% { opacity: 0; transform: translate(-50%, -50%) scale(1) rotate(-10deg); }
}

@media (prefers-reduced-motion: reduce) {
  .certificate-award-stage.is-awarding :deep(.certificate-preview),
  .certificate-award-stage.is-awarding::after {
    animation: none;
  }
}
</style>
