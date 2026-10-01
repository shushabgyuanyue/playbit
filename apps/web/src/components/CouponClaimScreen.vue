<script setup lang="ts">
import { copy } from "@playbit/content";
import { Check, Gift, LogIn } from "lucide-vue-next";
import type { CouponClaimPreview } from "../types/voucher";
import BaseButton from "./ui/BaseButton.vue";
import LifeServiceHero from "./ui/LifeServiceHero.vue";

const props = defineProps<{
  coupon: CouponClaimPreview | null;
  currentUserNickname: string | null;
  loading: boolean;
  claiming: boolean;
  error: string | null;
}>();

const emit = defineEmits<{
  back: [];
  home: [];
  login: [];
  claim: [];
}>();
</script>

<template>
  <section class="life-page service-flow-page coupon-claim-page">
    <LifeServiceHero
      class="service-flow-hero"
      :title="copy.vouchers.claim.title"
      :show-back="true"
      :show-home="true"
      :back-label="copy.common.back"
      :home-label="copy.common.home"
      @back="emit('back')"
      @home="emit('home')"
    />

    <div class="life-page-content service-flow-content coupon-claim-content">
      <section v-if="props.loading" class="life-panel coupon-claim-state" role="status">
        {{ copy.common.loading }}
      </section>
      <section v-else-if="props.coupon" class="life-panel coupon-claim-card">
        <div class="coupon-claim-mark"><Gift :size="23" aria-hidden="true" /></div>
        <p class="coupon-claim-kicker">{{ copy.vouchers.claim.issuer }} {{ props.coupon.issuerNickname }}</p>
        <h2 class="life-section-title">{{ props.coupon.name }}</h2>
        <p class="life-section-caption">{{ props.coupon.description }}</p>
        <div class="coupon-claim-recipient">
          <span>{{ copy.vouchers.claim.remaining(props.coupon.remainingClaims) }}</span>
          <strong>{{ copy.vouchers.claim.claimCount(props.coupon.claimedCount, props.coupon.claimLimit) }}</strong>
        </div>
        <p v-if="props.coupon.transferNote" class="coupon-claim-note">{{ props.coupon.transferNote }}</p>
        <p class="coupon-claim-login-note">{{ copy.vouchers.claim.loginHint }}</p>
        <BaseButton v-if="!props.currentUserNickname" size="lg" @click="emit('login')">
          <LogIn :size="18" />{{ copy.auth.login }}
        </BaseButton>
        <BaseButton v-else size="lg" :loading="props.claiming" :disabled="props.claiming" @click="emit('claim')">
          <Check :size="18" />{{ copy.vouchers.claim.claimAction }}
        </BaseButton>
        <p v-if="props.error" class="life-field-error" role="alert">{{ props.error }}</p>
      </section>
      <section v-else class="life-panel coupon-claim-state">
        <p>{{ props.error || copy.vouchers.claim.unavailable }}</p>
        <BaseButton variant="outline" @click="emit('home')">{{ copy.vouchers.claim.backToHome }}</BaseButton>
      </section>
    </div>
  </section>
</template>

<style scoped>
.coupon-claim-page { background: var(--pb-surface-service); }
.coupon-claim-content { gap: 12px; }
.coupon-claim-card { display: grid; gap: 11px; text-align: center; }
.coupon-claim-mark { display: inline-grid; width: 52px; height: 52px; place-items: center; margin: 2px auto 1px; border-radius: 50%; background: #fff4dc; color: #a56b1b; }
.coupon-claim-kicker { margin: 0; color: #a56b1b; font-size: var(--pb-font-xs); font-weight: var(--pb-weight-semibold); }
.coupon-claim-card .life-section-title { justify-content: center; margin-top: 0; }
.coupon-claim-recipient { display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--pb-line); border-bottom: 1px solid var(--pb-line); padding: 11px 0; color: var(--pb-text-3); font-size: var(--pb-font-sm); }
.coupon-claim-recipient strong { color: var(--pb-text-1); font-weight: var(--pb-weight-semibold); }
.coupon-claim-note, .coupon-claim-login-note { margin: 0; color: var(--pb-text-2); font-size: var(--pb-font-sm); line-height: 1.5; }
.coupon-claim-note { border-radius: var(--pb-radius-md); background: var(--pb-fill-soft); padding: 9px; text-align: left; }
.coupon-claim-state { display: grid; gap: 13px; justify-items: center; color: var(--pb-text-2); font-size: var(--pb-font-md); text-align: center; }
.coupon-claim-state p { margin: 0; }
</style>
