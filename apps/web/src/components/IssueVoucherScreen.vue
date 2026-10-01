<script setup lang="ts">
import { copy } from "@playbit/content";
import type { Coupon, Stake } from "@playbit/shared";
import { Check, Copy as CopyIcon, Gift, Minus, Plus, Share2 } from "lucide-vue-next";
import { computed, reactive, ref } from "vue";
import { publicInvitationUrl } from "../services/publicSite";
import BaseButton from "./ui/BaseButton.vue";
import BaseField from "./ui/BaseField.vue";
import LifeActionBar from "./ui/LifeActionBar.vue";
import LifeServiceHero from "./ui/LifeServiceHero.vue";
import StakePicker from "./StakePicker.vue";

const props = defineProps<{
  loading: boolean;
  createdCoupon: Coupon | null;
}>();

const emit = defineEmits<{
  back: [];
  home: [];
  submit: [{ stake: Stake; claimLimit: number; transferNote: string | null }];
  viewIssued: [];
}>();

const form = reactive({
  stake: { type: "coupon", label: "洗碗一次", fulfilled: false, additions: [] } as Stake,
  claimLimit: 1,
  transferNote: ""
});
const attempted = ref(false);
const copied = ref(false);
const sharing = ref(false);

const errors = computed(() => ({
  stake: attempted.value && !form.stake.label.trim() ? copy.vouchers.issue.equityRequired : ""
}));

const shareLink = computed(() => {
  const token = props.createdCoupon?.claimToken;
  return token ? publicInvitationUrl("coupon", token).toString() : "";
});

function submit() {
  attempted.value = true;
  if (errors.value.stake || props.loading) return;
  emit("submit", {
    stake: form.stake,
    claimLimit: form.claimLimit,
    transferNote: form.transferNote.trim() || null
  });
}

function changeClaimLimit(delta: number) {
  form.claimLimit = Math.min(999, Math.max(1, form.claimLimit + delta));
}

async function copyLink() {
  if (!shareLink.value || copied.value) return;
  try {
    await navigator.clipboard.writeText(shareLink.value);
    copied.value = true;
    window.setTimeout(() => { copied.value = false; }, 1800);
  } catch {
    copied.value = false;
  }
}

async function shareLinkToSystem() {
  if (!shareLink.value || sharing.value) return;
  sharing.value = true;
  try {
    if (navigator.share) {
      await navigator.share({
        title: props.createdCoupon?.name ?? copy.vouchers.issue.title,
        text: props.createdCoupon?.description ?? copy.vouchers.issue.issuedDescription,
        url: shareLink.value
      });
    } else {
      await copyLink();
    }
  } finally {
    sharing.value = false;
  }
}
</script>

<template>
  <section class="life-page service-flow-page issue-voucher-page">
    <LifeServiceHero
      class="service-flow-hero"
      :title="copy.vouchers.issue.title"
      :show-back="true"
      :show-home="true"
      :back-label="copy.common.back"
      :home-label="copy.common.home"
      @back="emit('back')"
      @home="emit('home')"
    />

    <div class="life-page-content service-flow-content issue-voucher-content">
      <template v-if="props.createdCoupon">
        <section class="issue-voucher-success life-panel" aria-live="polite">
          <div class="issue-voucher-success-mark"><Check :size="22" aria-hidden="true" /></div>
          <p class="issue-voucher-kicker">{{ copy.vouchers.issue.title }}</p>
          <h2 class="life-section-title">{{ copy.vouchers.issue.issuedTitle }}</h2>
          <p class="life-section-caption">{{ copy.vouchers.issue.issuedDescription }}</p>
          <div class="issue-voucher-preview">
            <strong>{{ props.createdCoupon.name }}</strong>
            <span>{{ props.createdCoupon.description }}</span>
            <small>{{ copy.vouchers.issue.remainingClaims(props.createdCoupon.remainingClaims) }} · {{ copy.vouchers.claim.claimCount(props.createdCoupon.claimedCount, props.createdCoupon.claimLimit) }}</small>
          </div>
          <label class="issue-voucher-link-field">
            <span>{{ copy.vouchers.issue.shareLink }}</span>
            <input :value="shareLink" readonly @focus="($event.target as HTMLInputElement).select()" />
          </label>
          <div class="issue-voucher-share-actions">
            <BaseButton variant="secondary" :disabled="!shareLink || sharing" @click="void shareLinkToSystem()">
              <Share2 :size="17" />{{ copy.vouchers.issue.shareLink }}
            </BaseButton>
            <BaseButton variant="outline" :disabled="!shareLink" @click="void copyLink()">
              <Check v-if="copied" :size="17" />
              <CopyIcon v-else :size="17" />{{ copied ? copy.vouchers.issue.copied : copy.vouchers.issue.copyLink }}
            </BaseButton>
          </div>
        </section>
        <BaseButton variant="ghost" @click="emit('viewIssued')">{{ copy.vouchers.issue.viewIssued }}</BaseButton>
      </template>

      <template v-else>
        <section class="issue-voucher-intro">
          <span class="issue-voucher-intro-icon"><Gift :size="20" aria-hidden="true" /></span>
          <div>
            <h2>{{ copy.vouchers.issue.title }}</h2>
            <p>{{ copy.vouchers.issue.description }}</p>
          </div>
        </section>
        <section class="life-panel issue-voucher-form-panel">
          <div class="issue-voucher-form">
            <StakePicker
              :model-value="form.stake"
              :title="copy.vouchers.issue.equityLabel"
              :error="errors.stake"
              equity-only
              @change="form.stake = $event"
            />
            <div class="issue-voucher-limit-row">
              <div>
                <span class="life-field-label">{{ copy.vouchers.issue.claimLimitLabel }}</span>
                <small>{{ copy.vouchers.issue.claimLimitHint }}</small>
              </div>
              <div class="issue-voucher-stepper" role="group" :aria-label="copy.vouchers.issue.claimLimitLabel">
                <button type="button" :title="copy.common.decrease" :aria-label="copy.common.decrease" :disabled="form.claimLimit <= 1" @click="changeClaimLimit(-1)">
                  <Minus :size="16" aria-hidden="true" />
                </button>
                <output>{{ form.claimLimit }}</output>
                <button type="button" :title="copy.common.increase" :aria-label="copy.common.increase" :disabled="form.claimLimit >= 999" @click="changeClaimLimit(1)">
                  <Plus :size="16" aria-hidden="true" />
                </button>
              </div>
            </div>
            <BaseField v-model="form.transferNote" :label="copy.vouchers.issue.noteLabel" :placeholder="copy.vouchers.issue.notePlaceholder" :maxlength="50" :multiline="true" />
          </div>
        </section>
      </template>
    </div>

    <LifeActionBar v-if="!props.createdCoupon">
      <BaseButton size="lg" :loading="props.loading" :disabled="props.loading" @click="submit">
        <Gift :size="18" />{{ copy.vouchers.issue.submit }}
      </BaseButton>
    </LifeActionBar>
  </section>
</template>

<style scoped>
.issue-voucher-page { background: var(--pb-surface-service); }
.issue-voucher-content { gap: 12px; }
.issue-voucher-intro { display: flex; align-items: flex-start; gap: 11px; padding: 4px 2px 2px; }
.issue-voucher-intro-icon, .issue-voucher-success-mark { display: inline-grid; flex: 0 0 auto; place-items: center; border-radius: 50%; background: #fff4dc; color: #a56b1b; }
.issue-voucher-intro-icon { width: 40px; height: 40px; }
.issue-voucher-intro h2 { margin: 1px 0 5px; color: var(--pb-text-1); font-size: var(--pb-font-lg); }
.issue-voucher-intro p { margin: 0; color: var(--pb-text-2); font-size: var(--pb-font-sm); line-height: 1.55; }
.issue-voucher-form-panel { padding: 15px; }
.issue-voucher-form { display: grid; gap: 15px; }
.issue-voucher-limit-row { display: flex; align-items: center; justify-content: space-between; gap: 14px; border-top: 1px solid var(--pb-line-soft); border-bottom: 1px solid var(--pb-line-soft); padding: 13px 0; }
.issue-voucher-limit-row > div:first-child { display: grid; gap: 4px; min-width: 0; }
.issue-voucher-limit-row small { color: var(--pb-text-3); font-size: var(--pb-font-xs); line-height: 1.45; }
.issue-voucher-stepper { display: inline-flex; flex: 0 0 auto; align-items: center; gap: 8px; }
.issue-voucher-stepper button { display: inline-grid; width: 32px; height: 32px; place-items: center; border: 1px solid var(--pb-line-soft); border-radius: 50%; background: #fff; color: var(--pb-text-1); cursor: pointer; }
.issue-voucher-stepper button:disabled { cursor: not-allowed; opacity: .35; }
.issue-voucher-stepper output { min-width: 24px; color: var(--pb-text-1); font-size: var(--pb-font-lg); font-weight: var(--pb-weight-semibold); text-align: center; }
.issue-voucher-success { display: grid; gap: 10px; text-align: center; }
.issue-voucher-success-mark { width: 46px; height: 46px; margin: 0 auto 1px; background: #edf8f2; color: var(--pb-green); }
.issue-voucher-kicker { margin: 0; color: #a56b1b; font-size: var(--pb-font-xs); font-weight: var(--pb-weight-semibold); }
.issue-voucher-success .life-section-title { justify-content: center; margin-top: 0; }
.issue-voucher-preview { display: grid; gap: 5px; margin-top: 4px; border: 1px solid rgba(166, 109, 30, .16); border-radius: var(--pb-radius-md); background: #fffaf0; padding: 13px; text-align: left; }
.issue-voucher-preview strong { color: var(--pb-text-1); font-size: var(--pb-font-lg); }
.issue-voucher-preview span { color: var(--pb-text-2); font-size: var(--pb-font-sm); line-height: 1.5; }
.issue-voucher-preview small { color: #a56b1b; font-size: var(--pb-font-xs); }
.issue-voucher-link-field { display: grid; gap: 6px; text-align: left; }
.issue-voucher-link-field span { color: var(--pb-text-2); font-size: var(--pb-font-sm); font-weight: var(--pb-weight-medium); }
.issue-voucher-link-field input { width: 100%; min-height: 40px; box-sizing: border-box; border: 1px solid var(--pb-line-soft); border-radius: var(--pb-radius-md); background: var(--pb-fill-soft); color: var(--pb-text-3); padding: 0 9px; font: inherit; font-size: var(--pb-font-xs); }
.issue-voucher-share-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.issue-voucher-share-actions :deep(.life-button) { min-height: 42px; padding-right: 8px; padding-left: 8px; font-size: var(--pb-font-sm); }
</style>
