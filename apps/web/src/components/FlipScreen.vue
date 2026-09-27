<script setup lang="ts">
import { copy } from "@playbit/content";
import type { Agreement, Coupon, Flip } from "@playbit/shared";
import { Download, RefreshCw, Share2 } from "lucide-vue-next";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import BaseBadge from "./ui/BaseBadge.vue";
import BaseButton from "./ui/BaseButton.vue";
import CardReveal from "./ui/CardReveal.vue";
import GameCardStage from "./game/GameCardStage.vue";
import GameEquity from "./game/GameEquity.vue";
import ResultPicker from "./game/ResultPicker.vue";
import CertificateScreen from "./CertificateScreen.vue";
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
  home: [];
  accept: [accept: boolean];
  refresh: [];
  recordResult: [winnerUserId: string];
  share: [];
  viewVouchers: [];
  openVoucher: [id: string];
}>();

const applicant = computed(() => props.agreement?.participants.find((person) => person.userId === props.flip.applicantUserId));
const invitee = computed(() => props.agreement?.participants.find((person) => person.userId === props.flip.inviteeUserId));
const isInvitee = computed(() => props.currentUserId === props.flip.inviteeUserId);
const isApplicant = computed(() => props.currentUserId === props.flip.applicantUserId);
const resultOpen = ref(false);
const certificateRef = ref<InstanceType<typeof CertificateScreen> | null>(null);
const resultParticipants = computed(() => (props.agreement?.participants ?? []).map(person => ({ ...person, id: person.userId! })));
const outcomes = computed(() => ({ [props.flip.applicantUserId]: copy.flip.confirmApplicantWon, [props.flip.inviteeUserId]: copy.flip.confirmApplicantLost }));

let refreshTimer: number | undefined;
function syncOpenFlip() {
  if (refreshTimer) window.clearInterval(refreshTimer);
  refreshTimer = undefined;
  if (["pending_acceptance", "active"].includes(props.flip.status)) {
    refreshTimer = window.setInterval(() => { if (document.visibilityState === 'visible') emit("refresh"); }, 5000);
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
      :show-home="true"
      :back-label="copy.common.back"
      :home-label="copy.common.home"
      @back="emit('back')"
      @home="emit('home')"
    />

    <div class="life-page-content service-flow-content">
      <CertificateScreen v-if="props.flip.status === 'settled'" ref="certificateRef" :agreement="props.agreement" :flip="props.flip" :current-user-id="props.currentUserId" kind="flip" embedded />
      <section v-else class="flip-game-stage">
        <GameCardStage :card="props.flip.card" />
        <CardReveal
          v-if="props.flip.card.reveal && props.flip.status !== 'pending_acceptance'"
          :key="props.flip.card.id"
          :answer="props.flip.card.reveal"
        />
      </section>

      <section v-if="props.flip.status !== 'settled'" class="flip-equity">
        <GameEquity v-if="props.coupon" :title="copy.flip.equityTitle" :stake="{ type: 'coupon', label: props.coupon.name, fulfilled: false, additions: [] }" />
        <ul class="life-info-list">
          <li><span>{{ copy.vouchers.detail.agreement }}</span><strong>{{ props.agreement?.title ?? copy.common.unavailable }}</strong></li>
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

      <section v-else-if="props.flip.status === 'settled'" class="flip-equity">
        <p class="life-section-caption">
          {{ props.flip.outcome === 'applicant_won' ? copy.flip.applicantWon : copy.flip.applicantLost }}
        </p>
        <GameEquity v-if="props.coupon" :coupon-id="props.coupon.id" @open="emit('openVoucher', $event)" :title="props.flip.outcome === 'applicant_won' ? copy.flip.originalWaived : copy.flip.originalRetained" :stake="{ type: 'coupon', label: props.coupon.name, fulfilled: props.flip.outcome === 'applicant_won', additions: [] }" />
        <GameEquity v-if="props.issuedCoupon" :coupon-id="props.issuedCoupon.id" @open="emit('openVoucher', $event)" :title="copy.flip.additionalEquity" :stake="{ type: 'coupon', label: props.issuedCoupon.name, fulfilled: false, additions: [] }" />
      </section>

      <section v-else-if="props.flip.status === 'declined'" class="life-panel">
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
      <template v-else-if="props.flip.status === 'settled'">
        <BaseButton variant="outline" size="lg" :loading="certificateRef?.busy" @click="certificateRef?.saveCertificate()"><Download :size="17" />{{ copy.certificate.save }}</BaseButton>
        <BaseButton size="lg" :loading="certificateRef?.busy" @click="certificateRef?.shareCertificate()"><Share2 :size="17" />{{ copy.certificate.share }}</BaseButton>
      </template>
      <template v-else>
        <BaseButton variant="outline" size="lg" @click="emit('back')">{{ copy.common.back }}</BaseButton>
        <BaseButton size="lg" @click="emit('viewVouchers')">{{ copy.flip.viewVouchers }}</BaseButton>
      </template>
    </LifeActionBar>
    <ResultPicker v-model:show="resultOpen" :participants="resultParticipants" :outcomes="outcomes" :loading="props.loading" @submit="emit('recordResult', $event)" />
  </section>
</template>

<style scoped>
.flip-game-stage { min-width: 0; }
.flip-game-stage :deep(.card-reveal) { max-width: 350px; margin: 0 auto; }
.flip-page { background: var(--pb-surface-game-stage); }
.flip-equity { display: grid; gap: 12px; }

</style>
