<script setup lang="ts">
import { copy } from "@playbit/content";
import type { Agreement, Coupon } from "@playbit/shared";
import { BadgeCheck, Home, Share2, Ticket } from "lucide-vue-next";
import { computed } from "vue";
import BaseButton from "./ui/BaseButton.vue";
import BaseBadge from "./ui/BaseBadge.vue";
import AgreementProgress from "./AgreementProgress.vue";
import ContractDocument from "./ContractDocument.vue";
import LifeActionBar from "./ui/LifeActionBar.vue";
import LifeServiceHero from "./ui/LifeServiceHero.vue";
import VoucherCard from "./VoucherCard.vue";
import { buildVoucherItems } from "../composables/useVoucherAssets";
import { getEffectiveStakeLabel, getLoserName, getWinnerName } from "../utils/sessionDisplay";

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
  openAgreement: [];
  openShare: [];
  openCertificate: [kind: "result" | "fulfillment" | "waiver"];
  fulfill: [];
}>();

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
</script>

<template>
  <section class="life-page service-flow-page">
    <LifeServiceHero
      class="service-flow-hero"
      :title="copy.settlement.navTitle"
      :show-back="props.showBack"
      :back-label="copy.common.back"
      @back="emit('back')"
    />

    <div class="life-page-content service-flow-content">
      <AgreementProgress :agreement="props.agreement" />
      <ContractDocument :agreement="props.agreement" :compact="true" :show-seal="true" />
      <section class="life-panel settlement-result-panel">
        <div class="settlement-result-heading">
          <BaseBadge :tone="fulfilled || waived ? 'success' : 'pending'">
            {{ waived ? copy.settlement.waived : fulfilled ? copy.settlement.fulfilled : copy.settlement.pending }}
          </BaseBadge>
          <h2 class="life-section-title">{{ copy.settlement.title }}</h2>
        </div>
        <ul class="life-info-list">
          <li><span>{{ copy.settlement.agreement }}</span><strong>{{ props.agreement.title }}</strong></li>
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
        <BaseButton
          class="settlement-certificate-action"
          variant="outline"
          @click="emit('openCertificate', waived ? 'waiver' : fulfilled ? 'fulfillment' : 'result')"
        >
          <BadgeCheck :size="17" />
          {{ waived ? copy.certificate.waiverTitle : fulfilled ? copy.certificate.fulfillmentTitle : copy.certificate.resultTitle }}
        </BaseButton>
      </section>
      <section class="life-panel settlement-issue-panel">
        <h2 class="life-section-title">
          {{ issueTitle }}
        </h2>
        <p class="life-section-caption">
          {{ issueHint }}
        </p>
        <VoucherCard
          v-if="voucher"
          :voucher="voucher"
          @open-agreement="emit('openAgreement')"
          @open-detail="emit('openVouchers')"
          @open-rules="emit('openVouchers')"
          @redeem="emit('openVouchers')"
        />
        <BaseButton
          v-if="!isCouponStake && props.agreement.status === 'result_recorded'"
          class="settlement-fulfill-action"
          variant="outline"
          @click="emit('fulfill')"
        >
          <BadgeCheck :size="17" />{{ copy.settlement.completeCustom }}
        </BaseButton>
      </section>
    </div>

    <LifeActionBar>
      <BaseButton variant="outline" size="lg" @click="emit('openShare')">
        <Share2 :size="18" />
        {{ copy.share.copyLink }}
      </BaseButton>
      <BaseButton v-if="isCouponStake" variant="secondary" size="lg" @click="emit('openVouchers')">
        <Ticket :size="18" />
        {{ copy.settlement.openVouchers }}
      </BaseButton>
      <BaseButton variant="ghost" size="lg" @click="emit('home')">
        <Home :size="18" />
        {{ copy.settlement.backHome }}
      </BaseButton>
    </LifeActionBar>
  </section>
</template>

<style scoped>
.settlement-fulfill-action {
  margin-top: 14px;
}
</style>
