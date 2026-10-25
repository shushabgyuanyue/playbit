<script setup lang="ts">
import { copy } from "@playbit/content";
import type { Flip, GraceWaiver } from "@playbit/shared";
import { BadgeCheck, RotateCcw, Stamp } from "lucide-vue-next";
import { ref } from "vue";
import type { VoucherItem } from "../types/voucher";
import BaseBadge from "./ui/BaseBadge.vue";
import BaseButton from "./ui/BaseButton.vue";
import LifeActionBar from "./ui/LifeActionBar.vue";
import LifeServiceHero from "./ui/LifeServiceHero.vue";

const props = defineProps<{
  voucher: VoucherItem;
  canFlip: boolean;
  flip: Flip | null;
  flipLoading: boolean;
  flipError: boolean;
  flipBusy: boolean;
  hasAvailableGraceTicket: boolean;
  waiver: GraceWaiver | null;
  canRespondWaiver: boolean;
  isWaiverRequester: boolean;
}>();

const emit = defineEmits<{
  back: [];
  home: [];
  openAgreement: [voucher: VoucherItem];
  redeem: [voucher: VoucherItem];
  flip: [couponId: string];
  openFlip: [];
  retryFlip: [];
  requestWaiver: [couponId: string];
  respondWaiver: [waiverId: string, accept: boolean];
  openCertificate: [];
}>();

const flipped = ref(false);

function toggleFlip() {
  flipped.value = !flipped.value;
}

function issuedDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

function statusTone(status: VoucherItem["status"]) {
  if (status === "available") {
    return "redeem";
  }
  if (status === "pending") {
    return "pending";
  }
  return "archive";
}
</script>

<template>
  <section class="life-page service-flow-page">
    <LifeServiceHero
      class="service-flow-hero"
      :title="copy.vouchers.detailTitle"
      :show-back="true"
      :show-home="true"
      :back-label="copy.common.back"
      :home-label="copy.common.home"
      @back="emit('back')"
      @home="emit('home')"
    />

    <div class="life-page-content service-flow-content">
      <section class="voucher-detail-ticket-panel">
        <div class="voucher-flip-card-shell">
          <button
            type="button"
            class="voucher-flip-card"
            :class="{ 'is-flipped': flipped }"
            :aria-label="flipped ? copy.vouchers.backHint : copy.vouchers.flipHint"
            @click="toggleFlip"
          >
            <span class="voucher-flip-face voucher-flip-front">
              <span class="voucher-detail-status"><BaseBadge :tone="statusTone(props.voucher.status)">{{ copy.vouchers.statusTabs[props.voucher.status] }}</BaseBadge></span>
              <strong class="voucher-detail-benefit">{{ props.voucher.benefitTitle }}</strong>
              <span class="voucher-detail-subtitle">{{ props.voucher.benefitSubtitle }}</span>
              <span class="voucher-detail-source">{{ copy.vouchers.sourceLabel }} · {{ props.voucher.sourceLabel }}</span>
              <span class="voucher-detail-number">{{ props.voucher.voucherNumber }}</span>
            </span>
            <span class="voucher-flip-face voucher-flip-back">
              <span class="voucher-back-row"><small>{{ copy.vouchers.voucherNumber }}</small><strong>{{ props.voucher.voucherNumber }}</strong></span>
              <span class="voucher-back-row voucher-back-signature-row">
                <small>{{ copy.vouchers.signature }}</small>
                <span class="voucher-back-signature">
                  <img v-if="props.voucher.signatureDataUrl" :src="props.voucher.signatureDataUrl" :alt="copy.vouchers.signature" />
                  <em v-else>{{ copy.vouchers.signatureMissing }}</em>
                </span>
              </span>
              <span class="voucher-back-row"><small>{{ copy.vouchers.issuedAt }}</small><strong>{{ issuedDate(props.voucher.issuedAt) }}</strong></span>
            </span>
          </button>
        </div>
      </section>

      <section v-if="props.voucher.agreementId" class="life-panel">
        <h2 class="life-section-title">{{ copy.vouchers.detail.agreement }}</h2>
        <ul class="life-info-list">
          <li>
            <span>{{ copy.vouchers.relatedAgreement }}</span>
            <strong>{{ props.voucher.agreementTitle }}</strong>
          </li>
          <li>
            <span>{{ copy.vouchers.agreementNo }}</span>
            <strong>{{ props.voucher.agreementCode }}</strong>
          </li>
          <li>
            <span>{{ copy.vouchers.detail.time }}</span>
            <strong>{{ props.voucher.timeText }}</strong>
          </li>
        </ul>
      </section>

      <section class="life-panel">
        <h2 class="life-section-title">{{ copy.vouchers.detail.rule }}</h2>
        <p class="life-section-caption">{{ props.voucher.ruleText }}</p>
      </section>

      <section class="life-panel">
        <h2 class="life-section-title">{{ copy.vouchers.detail.parties }}</h2>
        <ul class="life-info-list">
          <li>
            <span>{{ copy.vouchers.issuer }}</span>
            <strong>{{ props.voucher.issuerName }}</strong>
          </li>
          <li>
            <span>{{ copy.vouchers.holder }}</span>
            <strong>{{ props.voucher.holderName }}</strong>
          </li>
        </ul>
      </section>

      <section v-if="props.flip" class="life-panel">
        <h2 class="life-section-title">{{ copy.flip.recordTitle }}</h2>
        <ul class="life-info-list">
          <li><span>{{ copy.flip.cardLabel }}</span><strong>{{ props.flip.card.name }}</strong></li>
          <li><span>{{ copy.settlement.status }}</span><strong>{{ copy.flip.statuses[props.flip.status] }}</strong></li>
        </ul>
      </section>

      <section v-if="props.waiver" class="life-panel">
        <h2 class="life-section-title">{{ copy.vouchers.graceTitle }}</h2>
        <template v-if="props.waiver.status === 'pending'">
          <p class="life-section-caption">
            {{ props.canRespondWaiver ? copy.vouchers.gracePending : copy.vouchers.graceWait }}
          </p>
          <div v-if="props.canRespondWaiver" class="life-inline-actions">
            <BaseButton variant="outline" @click="emit('respondWaiver', props.waiver!.id, false)">
              {{ copy.vouchers.graceReject }}
            </BaseButton>
            <BaseButton @click="emit('respondWaiver', props.waiver!.id, true)">
              <BadgeCheck :size="17" />{{ copy.vouchers.graceApprove }}
            </BaseButton>
          </div>
          <p v-else-if="props.isWaiverRequester" class="life-inline-status">{{ copy.vouchers.graceWait }}</p>
        </template>
        <p v-else-if="props.waiver.status === 'approved'" class="life-section-caption">
          {{ copy.vouchers.waiverRecorded }}
        </p>
        <p v-else class="life-section-caption">{{ copy.vouchers.graceRejected }}</p>
      </section>
    </div>

    <LifeActionBar>
      <div class="life-inline-actions">
        <BaseButton v-if="props.voucher.agreementId" variant="outline" size="lg" @click="emit('openAgreement', props.voucher)">
          {{ copy.vouchers.viewAgreement }}
        </BaseButton>
        <BaseButton
          v-if="props.canFlip && props.voucher.couponId"
          variant="secondary"
          size="lg"
          :disabled="props.flipBusy"
          :loading="props.flipBusy"
          @click="emit('flip', props.voucher.couponId)"
        >
          <RotateCcw :size="17" />{{ copy.vouchers.flipAction }}
        </BaseButton>
        <BaseButton v-if="props.flip" variant="outline" size="lg" @click="emit('openFlip')">
          <RotateCcw :size="17" />
          {{ props.voucher.couponId === props.flip.couponId ? copy.flip.openRecord : copy.flip.openSource }}
        </BaseButton>
        <BaseButton
          v-else-if="props.voucher.sourceStatus === 'reserved' || Boolean(props.voucher.sourceFlipId)"
          variant="outline"
          size="lg"
          :loading="props.flipLoading"
          :disabled="props.flipLoading"
          @click="emit('retryFlip')"
        >
          {{ props.flipLoading ? copy.flip.loadingRecord : copy.flip.retryRecord }}
        </BaseButton>
        <BaseButton
          v-if="props.hasAvailableGraceTicket && props.voucher.role === 'issuer' && props.voucher.sourceStatus === 'available' && props.voucher.couponId"
          variant="outline"
          size="lg"
          @click="emit('requestWaiver', props.voucher.couponId)"
        >
          {{ copy.vouchers.graceAction }}
        </BaseButton>
        <div v-if="props.voucher.status === 'available'" class="voucher-redeem-action">
          <BaseButton
            variant="danger"
            size="lg"
            @click="emit('redeem', props.voucher)"
          >
            <Stamp :size="18" />{{ copy.vouchers.confirmRedeem }}
          </BaseButton>
          <p class="voucher-redeem-hint">{{ copy.vouchers.flipHint }}</p>
        </div>
        <BaseButton
          v-if="props.waiver?.status === 'approved'"
          variant="secondary"
          size="lg"
          @click="emit('openCertificate')"
        >
          <BadgeCheck :size="17" />{{ copy.certificate.waiverTitle }}
        </BaseButton>
      </div>
    </LifeActionBar>
  </section>
</template>

<style scoped>
.voucher-detail-ticket-panel {
  display: grid;
  justify-items: center;
  gap: 8px;
}

.voucher-flip-card-shell {
  width: min(100%, 300px);
  aspect-ratio: 1.62;
  perspective: 900px;
}

.voucher-flip-card {
  position: relative;
  width: 100%;
  height: 100%;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--pb-text-1);
  padding: 0;
  text-align: left;
  transform-style: preserve-3d;
  transition: transform 420ms cubic-bezier(.2, .7, .2, 1);
  cursor: pointer;
}

.voucher-flip-card.is-flipped { transform: rotateY(180deg); }
.voucher-flip-card:focus-visible { outline: 2px solid var(--pb-blue); outline-offset: 4px; }

.voucher-flip-face {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, .8);
  border-radius: inherit;
  box-shadow: var(--pb-shadow-ticket);
  padding: 20px 22px;
  backface-visibility: hidden;
}

.voucher-flip-front {
  background: linear-gradient(135deg, #fff7f3 0%, #fffdfb 58%, #edf6ff 100%);
}

.voucher-flip-front::after {
  position: absolute;
  right: -22px;
  bottom: -34px;
  width: 138px;
  height: 138px;
  border: 1px solid rgba(22, 119, 255, .12);
  border-radius: 50%;
  content: "";
}

.voucher-detail-status,
.voucher-detail-benefit,
.voucher-detail-subtitle,
.voucher-detail-source,
.voucher-detail-number,
.voucher-back-row,
.voucher-back-signature { position: relative; z-index: 1; }

.voucher-detail-status { align-self: flex-start; }
.voucher-detail-benefit { margin-top: 15px; color: var(--pb-theme-redeem); font-size: 25px; font-weight: var(--pb-weight-semibold); line-height: 1.15; }
.voucher-detail-subtitle { margin-top: 6px; color: var(--pb-text-2); font-size: var(--pb-font-sm); }
.voucher-detail-source { margin-top: auto; color: var(--pb-text-3); font-size: var(--pb-font-xs); }
.voucher-detail-number { margin-top: 5px; color: var(--pb-text-3); font-family: var(--pb-font-numeric); font-size: 10px; letter-spacing: .08em; }

.voucher-flip-back {
  gap: 12px;
  background: linear-gradient(145deg, #f7fbff 0%, #fff 60%, #fff7ed 100%);
  transform: rotateY(180deg);
}

.voucher-back-row { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; border-bottom: 1px solid var(--pb-line-soft); padding-bottom: 7px; }
.voucher-back-row small { color: var(--pb-text-3); font-size: var(--pb-font-xs); }
.voucher-back-row strong { color: var(--pb-text-1); font-family: var(--pb-font-numeric); font-size: var(--pb-font-sm); font-weight: var(--pb-weight-semibold); }
.voucher-back-signature-row { align-items: center; }
.voucher-back-signature { display: flex; min-height: 34px; align-items: center; justify-content: flex-end; min-width: 0; }
.voucher-back-signature img { display: block; width: min(58%, 150px); max-height: 42px; object-fit: contain; }
.voucher-back-signature em { color: var(--pb-text-3); font-size: var(--pb-font-xs); font-style: normal; }
.voucher-redeem-action { display: grid; grid-column: 1 / -1; gap: 3px; }
.voucher-redeem-action :deep(.life-button) { width: 100%; }
.voucher-redeem-hint { margin: 0; color: var(--pb-text-3); font-size: var(--pb-font-xs); line-height: 1.4; text-align: center; }

@media (prefers-reduced-motion: reduce) {
  .voucher-flip-card { transition: none; }
}
</style>
