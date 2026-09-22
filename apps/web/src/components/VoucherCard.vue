<script setup lang="ts">
import { copy } from "@playbit/content";
import { ChevronRight } from "lucide-vue-next";
import { computed } from "vue";
import type { VoucherItem } from "../types/voucher";

const props = defineProps<{
  voucher: VoucherItem;
}>();

const emit = defineEmits<{
  openAgreement: [];
  openDetail: [];
  openRules: [];
  redeem: [];
}>();

const actionLabel = computed(() => {
  if (props.voucher.canRedeem) {
    return copy.vouchers.redeem;
  }
  if (props.voucher.status === "pending") {
    return copy.vouchers.pendingAction;
  }
  return copy.vouchers.archivedAction;
});
</script>

<template>
  <article
    class="voucher-ticket"
    :class="[`kind-${props.voucher.kind}`, `status-${props.voucher.status}`]"
    data-testid="voucher-card"
  >
    <section class="voucher-ticket-value">
      <strong>{{ props.voucher.benefitTitle }}</strong>
      <span>{{ props.voucher.benefitSubtitle }}</span>
    </section>

    <section class="voucher-ticket-main">
      <div class="voucher-ticket-copy">
        <div class="voucher-ticket-title-row">
          <strong>{{ props.voucher.agreementTitle }}</strong>
        </div>

        <p class="voucher-ticket-time">{{ props.voucher.timeText }}</p>

        <div class="voucher-ticket-links">
          <button type="button" @click="emit('openRules')">
            {{ copy.vouchers.rule }}
            <ChevronRight :size="13" />
          </button>
          <button type="button" @click="emit('openAgreement')">
            {{ copy.vouchers.viewAgreement }}
            <ChevronRight :size="13" />
          </button>
        </div>
      </div>

      <button
        type="button"
        class="voucher-ticket-action"
        :disabled="props.voucher.status === 'pending'"
        data-testid="voucher-redeem"
        @click="props.voucher.canRedeem ? emit('redeem') : emit('openDetail')"
      >
        {{ actionLabel }}
      </button>
    </section>
  </article>
</template>
