<script setup lang="ts">
import { copy } from "@playbit/content";
import { hasCouponEquity } from "@playbit/game-core";
import type { Agreement } from "@playbit/shared";
import { CheckCircle2, ChevronRight, Share2 } from "lucide-vue-next";
import { computed, ref } from "vue";
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
}>();

const emit = defineEmits<{
  back: [];
  home: [];
  openVouchers: [];
}>();

const certificateRef = ref<CertificateActions | null>(null);

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
  const saved = await certificate.saveCertificate();
  if (saved) await certificate.shareCertificate();
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
        <CertificateScreen
          ref="certificateRef"
          :agreement="props.agreement"
          :flip="null"
          kind="result"
          :current-user-id="currentUserId"
          :embedded="true"
        />
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
