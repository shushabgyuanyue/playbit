<script setup lang="ts">
import { copy } from "@playbit/content";
import { Stamp } from "lucide-vue-next";
import type { VoucherItem } from "../types/voucher";
import BaseBadge from "./ui/BaseBadge.vue";
import BaseButton from "./ui/BaseButton.vue";
import LifeActionBar from "./ui/LifeActionBar.vue";
import LifeAppBar from "./ui/LifeAppBar.vue";

const props = defineProps<{
  voucher: VoucherItem;
}>();

const emit = defineEmits<{
  back: [];
  openAgreement: [voucher: VoucherItem];
  redeem: [voucher: VoucherItem];
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
  <section class="life-page">
    <LifeAppBar
      :title="copy.vouchers.detailTitle"
      :show-back="true"
      :back-label="copy.common.back"
      @back="emit('back')"
    />

    <div class="life-page-content">
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
    </div>

    <LifeActionBar>
      <BaseButton variant="outline" size="lg" @click="emit('openAgreement', props.voucher)">
        {{ copy.vouchers.viewAgreement }}
      </BaseButton>
      <BaseButton
        v-if="props.voucher.status === 'available'"
        variant="danger"
        size="lg"
        @click="emit('redeem', props.voucher)"
      >
        <Stamp :size="18" />
        {{ copy.vouchers.confirmRedeem }}
      </BaseButton>
    </LifeActionBar>
  </section>
</template>
