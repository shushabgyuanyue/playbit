<script setup lang="ts">
import { copy } from "@playbit/content";
import type { Agreement, Coupon, Flip } from "@playbit/shared";
import { BadgeCheck, RefreshCw, Share2 } from "lucide-vue-next";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import BaseBadge from "./ui/BaseBadge.vue";
import BaseButton from "./ui/BaseButton.vue";
import CardReveal from "./ui/CardReveal.vue";
import LifeActionBar from "./ui/LifeActionBar.vue";
import LifeServiceHero from "./ui/LifeServiceHero.vue";

const props = defineProps<{
  flip: Flip;
  agreement: Agreement | null;
  coupon: Coupon | null;
  issuedCoupon: Coupon | null;
  currentUserId: string | null;
  loading?: boolean;
}>();

const emit = defineEmits<{
  back: [];
  accept: [accept: boolean];
  refresh: [];
  recordResult: [winnerUserId: string];
  share: [];
  certificate: [];
  viewVouchers: [];
}>();

const applicant = computed(() => props.agreement?.participants.find((person) => person.userId === props.flip.applicantUserId));
const invitee = computed(() => props.agreement?.participants.find((person) => person.userId === props.flip.inviteeUserId));
const isInvitee = computed(() => props.currentUserId === props.flip.inviteeUserId);
const isApplicant = computed(() => props.currentUserId === props.flip.applicantUserId);
const winnerName = computed(() => [applicant.value, invitee.value].find((person) => person?.userId === props.flip.winnerUserId)?.nickname ?? copy.common.unavailable);
const recorderName = computed(() => [applicant.value, invitee.value].find((person) => person?.userId === props.flip.resultRecorderUserId)?.nickname ?? copy.common.unavailable);
const resultOpen = ref(false);

let refreshTimer: number | undefined;
function syncOpenFlip() {
  if (refreshTimer) window.clearInterval(refreshTimer);
  refreshTimer = undefined;
  if (["pending_acceptance", "active"].includes(props.flip.status)) {
    refreshTimer = window.setInterval(() => emit("refresh"), 5000);
  }
}

onMounted(syncOpenFlip);
watch(() => [props.flip.status, props.currentUserId], syncOpenFlip);
watch(() => props.flip.status, () => { resultOpen.value = false; });
onUnmounted(() => {
  if (refreshTimer) window.clearInterval(refreshTimer);
});
</script>

<template>
  <section class="life-page service-flow-page flip-page">
    <LifeServiceHero
      class="service-flow-hero"
      :title="copy.flip.navTitle"
      :show-back="true"
      :back-label="copy.common.back"
      @back="emit('back')"
    />

    <div class="life-page-content service-flow-content">
      <section class="challenge-document">
        <BaseBadge tone="contract">{{ props.flip.card.name }}</BaseBadge>
        <h2 class="challenge-title">{{ props.flip.card.content }}</h2>
        <p class="challenge-content">{{ props.flip.card.winCondition }}</p>
        <CardReveal
          v-if="props.flip.card.reveal && props.flip.status !== 'pending_acceptance'"
          :key="props.flip.card.id"
          :answer="props.flip.card.reveal"
        />
      </section>

      <section class="life-panel">
        <h2 class="life-section-title">{{ copy.flip.equityTitle }}</h2>
        <ul class="life-info-list">
          <li><span>{{ copy.vouchers.detail.agreement }}</span><strong>{{ props.agreement?.title ?? copy.common.unavailable }}</strong></li>
          <li><span>{{ copy.settlement.stake }}</span><strong>{{ props.coupon?.name ?? copy.common.unavailable }}</strong></li>
          <li><span>{{ copy.flip.applicantLabel }}</span><strong>{{ applicant?.nickname ?? copy.common.unavailable }}</strong></li>
          <li><span>{{ copy.flip.inviteeLabel }}</span><strong>{{ invitee?.nickname ?? copy.common.unavailable }}</strong></li>
        </ul>
        <p class="life-section-caption">{{ copy.flip.equityHint }}</p>
      </section>

      <section v-if="props.flip.status === 'pending_acceptance'" class="life-panel">
        <p class="life-section-title">
          {{ isInvitee ? copy.flip.pendingInvitee : copy.flip.pendingApplicant }}
        </p>
      </section>

      <section v-else-if="props.flip.status === 'active' && resultOpen" class="life-panel">
        <h2 class="life-section-title">{{ copy.flip.recordResult }}</h2>
        <p class="life-section-caption">{{ copy.flip.resultDisclaimer }}</p>
        <div class="flip-result-options">
          <BaseButton
            v-if="applicant"
            variant="outline"
            :disabled="(!isApplicant && !isInvitee) || props.loading"
            @click="emit('recordResult', applicant.userId!)"
          >
            {{ applicant.nickname }}
          </BaseButton>
          <BaseButton
            v-if="invitee"
            variant="outline"
            :disabled="(!isApplicant && !isInvitee) || props.loading"
            @click="emit('recordResult', invitee.userId!)"
          >
            {{ invitee.nickname }}
          </BaseButton>
        </div>
      </section>

      <section v-else-if="props.flip.status === 'settled'" class="life-panel">
        <BaseBadge tone="success"><BadgeCheck :size="15" />{{ copy.certificate.resultStatus }}</BaseBadge>
        <h2 class="life-section-title">{{ copy.flip.winnerTitle }}：{{ winnerName }}</h2>
        <p class="life-section-caption">
          {{ props.flip.outcome === 'applicant_won' ? copy.flip.applicantWon : copy.flip.applicantLost }}
        </p>
        <ul class="life-info-list">
          <li>
            <span>{{ copy.flip.originalEquity }}</span>
            <strong>{{ props.coupon?.name ?? copy.common.unavailable }} · {{ props.flip.outcome === 'applicant_won' ? copy.flip.originalWaived : copy.flip.originalRetained }}</strong>
          </li>
          <li v-if="props.flip.outcome === 'applicant_lost'">
            <span>{{ copy.flip.additionalEquity }}</span>
            <strong>{{ props.issuedCoupon?.name ?? copy.flip.additionalPending }}</strong>
          </li>
          <li><span>{{ copy.flip.resultRecorder }}</span><strong>{{ recorderName }}</strong></li>
        </ul>
        <BaseButton class="flip-certificate-button" variant="outline" @click="emit('certificate')">
          <BadgeCheck :size="17" />{{ copy.certificate.flipTitle }}
        </BaseButton>
      </section>

      <section v-else class="life-panel">
        <BaseBadge tone="archive">{{ copy.flip.declined }}</BaseBadge>
        <p class="life-section-caption">{{ copy.flip.declinedHint }}</p>
      </section>
    </div>

    <LifeActionBar>
      <template v-if="props.flip.status === 'pending_acceptance' && isInvitee">
        <BaseButton variant="outline" size="lg" :loading="props.loading" @click="emit('accept', false)">
          {{ copy.flip.decline }}
        </BaseButton>
        <BaseButton size="lg" :loading="props.loading" @click="emit('accept', true)">
          {{ copy.flip.accept }}
        </BaseButton>
      </template>
      <template v-else-if="props.flip.status === 'pending_acceptance' && isApplicant">
        <BaseButton variant="outline" size="lg" :loading="props.loading" @click="emit('refresh')">
          <RefreshCw :size="17" />{{ copy.flip.refresh }}
        </BaseButton>
        <BaseButton size="lg" @click="emit('share')">
          <Share2 :size="17" />{{ copy.flip.share }}
        </BaseButton>
      </template>
      <template v-else-if="props.flip.status === 'active'">
        <BaseButton variant="outline" size="lg" @click="resultOpen ? resultOpen = false : emit('back')">
          {{ resultOpen ? copy.flip.keepPlaying : copy.flip.recordLater }}
        </BaseButton>
        <BaseButton v-if="!resultOpen" size="lg" :disabled="props.loading" @click="resultOpen = true">
          {{ copy.flip.recordResult }}
        </BaseButton>
      </template>
      <template v-else>
        <BaseButton variant="outline" size="lg" @click="emit('back')">{{ copy.common.back }}</BaseButton>
        <BaseButton size="lg" @click="emit('viewVouchers')">{{ copy.flip.viewVouchers }}</BaseButton>
      </template>
    </LifeActionBar>
  </section>
</template>

<style scoped>
.flip-result-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 18px;
}

.flip-certificate-button {
  margin-top: 16px;
}
</style>
