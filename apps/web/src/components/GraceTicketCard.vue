<script setup lang="ts">
import { copy } from "@playbit/content";
import type { GraceTicket } from "@playbit/shared";
import VoucherTicket from "./ui/VoucherTicket.vue";

defineProps<{ ticket: GraceTicket }>();
</script>

<template>
  <VoucherTicket kind="custom" variant="grace" watermark="panda"
    :status="ticket.status === 'available' ? 'available' : ticket.status === 'reserved' ? 'pending' : 'used'">
    <template #value>
      <span class="grace-engraving" aria-hidden="true">{{ copy.vouchers.graceMark }}</span>
      <strong>{{ copy.vouchers.graceTitle }}</strong>
      <span>{{ copy.vouchers.graceEdition }}</span>
    </template>
    <div class="grace-ticket-face">
      <div class="grace-ticket-topline">
        <span>{{ copy.vouchers.graceMilestonePrefix }}{{ ticket.earnedAtFulfillmentCount }}{{ copy.vouchers.graceMilestoneSuffix }}</span>
        <span class="grace-ticket-rarity">{{ copy.vouchers.graceRareLabel }}</span>
      </div>
      <strong class="grace-ticket-status">{{ ticket.status === 'available' ? copy.vouchers.graceAvailable : ticket.status === 'reserved' ? copy.vouchers.graceReserved : copy.vouchers.graceUsed }}</strong>
      <p class="grace-ticket-promise">{{ copy.vouchers.gracePrivilege }}</p>
      <p class="grace-ticket-rule">{{ copy.vouchers.graceRule }}</p>
      <small class="grace-ticket-serial">{{ copy.vouchers.graceSerial }} · {{ ticket.id.slice(-8).toUpperCase() }}</small>
    </div>
  </VoucherTicket>
</template>
