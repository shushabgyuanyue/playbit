<script setup lang="ts">
import type { VoucherKind, VoucherUiStatus } from "../../types/voucher";
import BrandMascot from "./BrandMascot.vue";

const props = withDefaults(defineProps<{
  kind: VoucherKind;
  status?: VoucherUiStatus;
  size?: "default" | "mini";
  variant?: "default" | "grace";
  watermark?: "panda" | "rabbit" | "none";
  interactive?: boolean;
}>(), {
  size: "default",
  variant: "default",
  status: undefined,
  watermark: "panda",
  interactive: false
});

const emit = defineEmits<{
  click: [event: MouseEvent];
}>();
</script>

<template>
  <component
    :is="props.interactive ? 'button' : 'article'"
    :type="props.interactive ? 'button' : undefined"
    class="voucher-ticket"
    :class="[
      `kind-${props.kind}`,
      `voucher-ticket-${props.size}`,
      `voucher-ticket-${props.variant}`,
      props.status ? `status-${props.status}` : '',
      { 'voucher-ticket-interactive': props.interactive }
    ]"
    @click="props.interactive ? emit('click', $event) : undefined"
  >
    <BrandMascot
      v-if="props.watermark === 'panda'"
      class="voucher-ticket-watermark voucher-ticket-watermark-panda"
      variant="panda"
      width="92"
      height="92"
    />
    <BrandMascot
      v-else-if="props.watermark === 'rabbit'"
      class="voucher-ticket-watermark voucher-ticket-watermark-rabbit"
      variant="rabbit"
      width="76"
      height="76"
    />
    <section class="voucher-ticket-value">
      <slot name="value" />
    </section>
    <section class="voucher-ticket-main">
      <slot />
    </section>
  </component>
</template>
