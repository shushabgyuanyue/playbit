<script setup lang="ts">
import { copy } from "@playbit/content";
import type { Agreement, Coupon } from "@playbit/shared";
import { Download, Share2 } from "lucide-vue-next";
import { computed, ref } from "vue";
import BaseButton from "./ui/BaseButton.vue";
import BaseBadge from "./ui/BaseBadge.vue";
import CertificateScreen from "./CertificateScreen.vue";
import LifeActionBar from "./ui/LifeActionBar.vue";
import LifeServiceHero from "./ui/LifeServiceHero.vue";
import VoucherTicket from "./ui/VoucherTicket.vue";
import { buildVoucherItems } from "../composables/useVoucherAssets";
import { getEffectiveStakeLabel, getLoserName, getWinnerName } from "../utils/sessionDisplay";

type CertificateActions = {
  busy: boolean;
  saveCertificate: () => Promise<boolean>;
  shareCertificate: () => Promise<boolean>;
};

const props = defineProps<{
  agreement: Agreement;
  coupon: Coupon | null;
  currentUserId: string | null;
  showBack?: boolean;
}>();

const emit = defineEmits<{
  back: [];
  home: [];
  openVouchers: [];
  fulfill: [];
}>();

const certificateRef = ref<CertificateActions | null>(null);

const winner = computed(() => getWinnerName(props.agreement));
const loser = computed(() => getLoserName(props.agreement));
const resultRecorder = computed(
  () => props.agreement.participants.find((participant) => participant.userId === props.agreement.resultRecorderUserId)?.nickname ?? copy.common.unavailable
);
const fulfilled = computed(() => props.agreement.status === "fulfilled" || props.agreement.stake.fulfilled);
const waived = computed(() => props.agreement.status === "waived");
const isCouponStake = computed(() => props.agreement.stake.type === "coupon");
const issueTitle = computed(() => {
  if (isCouponStake.value) return copy.settlement.voucherIssued;
  if (props.agreement.stake.type === "point") return copy.settlement.pointRecorded;
  return copy.settlement.customRecorded;
});
const issueHint = computed(() => {
  if (isCouponStake.value) {
    return fulfilled.value || waived.value ? copy.settlement.voucherArchivedHint : copy.settlement.voucherIssuedHint;
  }
  if (props.agreement.stake.type === "point") return copy.settlement.pointRecordedHint;
  return copy.settlement.customRecordedHint;
});
const voucher = computed(() =>
  buildVoucherItems([props.agreement], props.coupon ? [props.coupon] : [], props.currentUserId).find(
    (item) => item.agreementId === props.agreement.id
  ) ?? null
);
const effectiveStake = computed(() => getEffectiveStakeLabel(props.agreement));
const certificateKind = computed<"result" | "fulfillment" | "waiver">(() => {
  if (waived.value) return "waiver";
  if (fulfilled.value) return "fulfillment";
  return "result";
});
const certificateBusy = computed(() => certificateRef.value?.busy ?? false);

async function saveResult() {
  await certificateRef.value?.saveCertificate();
}

async function shareResult() {
  await certificateRef.value?.shareCertificate();
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
      <section class="life-panel settlement-summary-panel">
        <div class="settlement-summary-heading">
          <div>
            <span class="settlement-summary-kicker">{{ copy.settlement.title }}</span>
            <h2 class="life-section-title">{{ props.agreement.title }}</h2>
          </div>
          <BaseBadge :tone="fulfilled || waived ? 'success' : 'pending'">
            {{ waived ? copy.settlement.waived : fulfilled ? copy.settlement.fulfilled : copy.settlement.pending }}
          </BaseBadge>
        </div>
        <ul class="life-info-list">
          <li><span>{{ copy.settlement.winner }}</span><strong>{{ winner }}</strong></li>
          <li><span>{{ copy.settlement.loser }}</span><strong>{{ loser }}</strong></li>
          <li><span>{{ copy.settlement.recorder }}</span><strong>{{ resultRecorder }}</strong></li>
          <li><span>{{ copy.settlement.stake }}</span><strong>{{ effectiveStake }}</strong></li>
          <li>
            <span>{{ copy.settlement.status }}</span>
            <strong>{{ waived ? copy.settlement.waived : fulfilled ? copy.settlement.fulfilled : copy.settlement.pending }}</strong>
          </li>
        </ul>
        <p class="life-section-caption">{{ copy.settlement.resultRecorder }}</p>
      </section>

      <section v-if="voucher" class="life-panel settlement-voucher-panel">
        <div class="settlement-section-heading">
          <h2 class="life-section-title">{{ issueTitle }}</h2>
          <span class="settlement-section-meta">{{ voucher.timeText }}</span>
        </div>
        <VoucherTicket
          :kind="voucher.kind"
          :status="voucher.status"
          size="mini"
          :watermark="voucher.status === 'used' ? 'rabbit' : 'panda'"
          :interactive="true"
          :aria-label="copy.settlement.openVouchers"
          @click="emit('openVouchers')"
        >
          <template #value>
            <strong>{{ voucher.benefitTitle }}</strong>
            <span>{{ voucher.benefitSubtitle }}</span>
          </template>
          <div class="settlement-voucher-copy">
            <strong>{{ voucher.agreementTitle }}</strong>
            <small>{{ voucher.timeText }}</small>
          </div>
        </VoucherTicket>
        <p class="life-section-caption">{{ issueHint }}</p>
      </section>

      <section v-else class="life-panel settlement-fulfillment-panel">
        <h2 class="life-section-title">{{ issueTitle }}</h2>
        <p class="life-section-caption">{{ issueHint }}</p>
        <BaseButton
          v-if="props.agreement.status === 'result_recorded' && props.agreement.stake.type === 'custom'"
          class="settlement-fulfill-action"
          variant="outline"
          @click="emit('fulfill')"
        >
          {{ copy.settlement.completeCustom }}
        </BaseButton>
      </section>

      <section class="settlement-certificate-panel" aria-labelledby="settlement-certificate-title">
        <div class="settlement-certificate-heading">
          <div>
            <span class="settlement-summary-kicker">{{ copy.certificate.eyebrow }}</span>
            <h2 id="settlement-certificate-title" class="life-section-title">{{ copy.certificate.resultTitle }}</h2>
          </div>
          <span class="settlement-certificate-mark">{{ copy.certificate.resultStatus }}</span>
        </div>
        <CertificateScreen
          ref="certificateRef"
          :agreement="props.agreement"
          :flip="null"
          :kind="certificateKind"
          :embedded="true"
        />
      </section>
    </div>

    <LifeActionBar>
      <BaseButton variant="outline" size="lg" :loading="certificateBusy" @click="saveResult">
        <Download :size="18" />
        {{ copy.settlement.downloadResult }}
      </BaseButton>
      <BaseButton size="lg" :loading="certificateBusy" @click="shareResult">
        <Share2 :size="18" />
        {{ copy.settlement.shareResult }}
      </BaseButton>
    </LifeActionBar>
  </section>
</template>

<style scoped>
.settlement-fulfill-action {
  margin-top: 14px;
}
</style>
