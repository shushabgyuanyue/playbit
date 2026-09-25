<script setup lang="ts">
import { copy } from "@playbit/content";
import type { Flip, GraceWaiver } from "@playbit/shared";
import { BadgeCheck, RotateCcw, Stamp } from "lucide-vue-next";
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
  openAgreement: [voucher: VoucherItem];
  redeem: [voucher: VoucherItem];
  flip: [couponId: string];
  openFlip: [];
  retryFlip: [];
  requestWaiver: [couponId: string];
  respondWaiver: [waiverId: string, accept: boolean];
  openCertificate: [];
}>();

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
      :back-label="copy.common.back"
      @back="emit('back')"
    />

    <div class="life-page-content service-flow-content">
      <section class="life-panel">
        <BaseBadge :tone="statusTone(props.voucher.status)">
          {{ copy.vouchers.statusTabs[props.voucher.status] }}
        </BaseBadge>
        <h2 class="life-section-title">{{ props.voucher.benefitTitle }}</h2>
        <p class="life-section-caption">{{ props.voucher.benefitSubtitle }}</p>
      </section>

      <section class="life-panel">
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
        <BaseButton variant="outline" size="lg" @click="emit('openAgreement', props.voucher)">
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
        <BaseButton
          v-if="props.voucher.status === 'available'"
          variant="danger"
          size="lg"
          @click="emit('redeem', props.voucher)"
        >
          <Stamp :size="18" />{{ copy.vouchers.confirmRedeem }}
        </BaseButton>
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
