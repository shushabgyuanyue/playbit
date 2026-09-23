<script setup lang="ts">
import { copy } from "@playbit/content";
import type { BetSession, Coupon } from "@playbit/shared";
import { Home, Share2, Ticket } from "lucide-vue-next";
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
  session: BetSession;
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
}>();

const winner = computed(() => getWinnerName(props.session));
const loser = computed(() => getLoserName(props.session));
const fulfilled = computed(() => props.session.stake.fulfilled);
const isCouponStake = computed(() => props.session.stake.type === "coupon");
const voucher = computed(() =>
  buildVoucherItems([props.session], props.coupon ? [props.coupon] : [], props.currentUserId).find(
    (item) => item.sessionId === props.session.id
  ) ?? null
);
const effectiveStake = computed(() => getEffectiveStakeLabel(props.session));
</script>

<template>
  <section class="life-page service-flow-page">
    <LifeServiceHero
      class="service-flow-hero"
      :eyebrow="copy.home.docketLabel"
      :title="copy.settlement.navTitle"
      :show-back="props.showBack"
      :back-label="copy.common.back"
      @back="emit('back')"
    />

    <div class="life-page-content service-flow-content">
      <AgreementProgress :session="props.session" />
      <ContractDocument :session="props.session" :compact="true" :show-seal="true" />
      <section class="life-panel settlement-result-panel">
        <div class="settlement-result-heading">
          <BaseBadge :tone="fulfilled ? 'success' : 'pending'">
            {{ fulfilled ? copy.settlement.fulfilled : copy.settlement.pending }}
          </BaseBadge>
          <h2 class="life-section-title">{{ copy.settlement.title }}</h2>
        </div>
        <ul class="life-info-list">
          <li><span>{{ copy.settlement.agreement }}</span><strong>{{ props.session.title }}</strong></li>
          <li><span>{{ copy.settlement.winner }}</span><strong>{{ winner }}</strong></li>
          <li><span>{{ copy.settlement.loser }}</span><strong>{{ loser }}</strong></li>
          <li><span>{{ copy.settlement.stake }}</span><strong>{{ effectiveStake }}</strong></li>
          <li>
            <span>{{ copy.settlement.status }}</span>
            <strong>{{ fulfilled ? copy.settlement.fulfilled : copy.settlement.pending }}</strong>
          </li>
        </ul>
      </section>
      <section class="life-panel settlement-issue-panel">
        <h2 class="life-section-title">
          {{ isCouponStake ? copy.settlement.voucherIssued : copy.settlement.customRecorded }}
        </h2>
        <p class="life-section-caption">
          {{ isCouponStake ? copy.settlement.voucherIssuedHint : copy.settlement.customRecordedHint }}
        </p>
        <VoucherCard
          v-if="voucher"
          :voucher="voucher"
          @open-agreement="emit('openAgreement')"
          @open-detail="emit('openVouchers')"
          @open-rules="emit('openVouchers')"
          @redeem="emit('openVouchers')"
        />
      </section>
      <p class="life-section-caption">{{ copy.share.screenshotHint }}</p>
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
