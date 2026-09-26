<script setup lang="ts">
import { copy } from "@playbit/content";
import type { Agreement } from "@playbit/shared";
import { BadgePlus, Check, CheckCircle2, Clock3 } from "lucide-vue-next";
import AgreementProgress from "./AgreementProgress.vue";
import BaseButton from "./ui/BaseButton.vue";
import BaseBadge from "./ui/BaseBadge.vue";
import LifeActionBar from "./ui/LifeActionBar.vue";
import LifeServiceHero from "./ui/LifeServiceHero.vue";
import StakePicker from "./StakePicker.vue";
import VoucherTicket from "./ui/VoucherTicket.vue";
import type { Stake } from "@playbit/shared";
import { getEffectiveStakeLabel } from "../utils/sessionDisplay";
import { inferVoucherKind, formatVoucherBenefit } from "../utils/voucherDisplay";
import { computed, ref, watch } from "vue";

const props = defineProps<{
  agreement: Agreement;
  currentUserId: string | null;
}>();

const emit = defineEmits<{
  back: [];
  settle: [winnerId: string];
  addBoost: [label: string];
  confirmBoost: [boostId: string];
}>();

const boostOpen = ref(false);
const boostStake = ref<Stake>({
  type: "custom",
  label: "",
  fulfilled: false,
  additions: []
});
const selectedWinnerId = ref<string | null>(null);
const customStakeLabel = copy.stakes.presets.find((preset) => preset.type === "custom")?.label ?? copy.stakes.custom;
const currentParticipantId = computed(
  () => props.agreement.participants.find((participant) => participant.userId === props.currentUserId)?.id ?? null
);
const canAddBoost = computed(() => props.agreement.boosts.length < 3);
const effectiveStake = computed(() => getEffectiveStakeLabel(props.agreement));
const hasSeparateChallenge = computed(() => props.agreement.challenge.trim() !== props.agreement.title.trim());
const boostIncomplete = computed(() =>
  boostStake.value.type === "custom" && boostStake.value.label.trim() === customStakeLabel
);

function isBoostConfirmed(boost: Agreement["boosts"][number]) {
  return boost.confirmedBy.length === props.agreement.participants.length;
}

function boostStatusLabel(boost: Agreement["boosts"][number]) {
  if (isBoostConfirmed(boost)) return copy.session.boostConfirmed;
  if (currentParticipantId.value && boost.confirmedBy.includes(currentParticipantId.value)) {
    return copy.session.boostYouConfirmed;
  }
  return copy.session.boostPending;
}

function canConfirmBoost(boost: Agreement["boosts"][number]) {
  return Boolean(
    currentParticipantId.value &&
      !boost.confirmedBy.includes(currentParticipantId.value) &&
      boost.confirmedBy.length < props.agreement.participants.length
  );
}

function submitResult() {
  if (selectedWinnerId.value) {
    emit("settle", selectedWinnerId.value);
  }
}

watch(
  () => props.agreement.id,
  () => {
    selectedWinnerId.value = null;
    boostOpen.value = false;
  }
);

function submitBoost() {
  const label = boostStake.value.label.trim();
  if (!label || boostIncomplete.value) {
    return;
  }
  emit("addBoost", label);
  boostStake.value = { type: "custom", label: "", fulfilled: false, additions: [] };
  boostOpen.value = false;
}
</script>

<template>
  <section class="life-page service-flow-page">
    <LifeServiceHero
      class="service-flow-hero"
      :title="copy.session.navTitle"
      :show-back="true"
      :back-label="copy.common.back"
      @back="emit('back')"
    />

    <div class="life-page-content service-flow-content">
      <AgreementProgress :agreement="props.agreement" />
      <section class="session-brief" aria-labelledby="session-brief-title">
        <header class="session-brief-header">
          <div>
            <span class="session-brief-kicker">{{ copy.session.briefLabel }}</span>
            <h1 id="session-brief-title">{{ props.agreement.title }}</h1>
          </div>
          <BaseBadge tone="success">{{ copy.session.active }}</BaseBadge>
        </header>
        <div v-if="hasSeparateChallenge" class="session-brief-subject">
          <span>{{ copy.session.subjectLabel }}</span>
          <p>{{ props.agreement.challenge }}</p>
        </div>
        <footer class="session-brief-stake">
          <span>{{ copy.session.currentStake }}</span>
          <strong>{{ effectiveStake }}</strong>
        </footer>
      </section>

      <section class="life-panel session-boost-panel">
        <header class="session-panel-header">
          <div>
            <h2 class="life-section-title">{{ copy.session.enhancementTitle }}</h2>
            <p class="session-panel-meta">{{ props.agreement.boosts.length }} / 3</p>
          </div>
          <button
            type="button"
            class="session-boost-trigger"
            :disabled="!canAddBoost"
            :aria-expanded="boostOpen"
            @click="boostOpen = !boostOpen"
          >
            <BadgePlus :size="16" aria-hidden="true" />
            <span>{{ copy.session.boost }}</span>
          </button>
        </header>

        <div v-if="props.agreement.boosts.length" class="session-boost-list">
          <VoucherTicket
            v-for="boost in props.agreement.boosts"
            :key="boost.id"
            :kind="inferVoucherKind(boost.label)"
            :status="isBoostConfirmed(boost) ? 'available' : 'pending'"
            size="mini"
            watermark="panda"
          >
            <template #value>
              <strong>{{ formatVoucherBenefit(boost.label).title }}</strong>
              <span>{{ formatVoucherBenefit(boost.label).subtitle }}</span>
            </template>
            <div class="session-boost-ticket-copy">
              <strong>{{ boost.label }}</strong>
              <small>{{ boostStatusLabel(boost) }}</small>
            </div>
            <BaseButton
              v-if="canConfirmBoost(boost)"
              size="sm"
              variant="outline"
              @click="emit('confirmBoost', boost.id)"
            >
              {{ copy.session.boostConfirm }}
            </BaseButton>
            <span v-else-if="isBoostConfirmed(boost)" class="session-boost-ticket-status" aria-hidden="true">
              <Check :size="14" />
            </span>
            <span v-else class="session-boost-ticket-status is-pending" aria-hidden="true">
              <Clock3 :size="14" />
            </span>
          </VoucherTicket>
        </div>

        <div v-if="boostOpen" class="session-boost-editor">
          <StakePicker :title="copy.session.boost" compact @change="boostStake = $event" />
          <BaseButton class="session-boost-submit" size="sm" variant="outline" :disabled="!boostStake.label.trim() || boostIncomplete" @click="submitBoost">
            {{ copy.session.boostSubmit }}
          </BaseButton>
        </div>
        <p v-if="!canAddBoost" class="session-boost-limit">{{ copy.session.boostLimit }}</p>
      </section>

      <section class="life-panel session-result-panel">
        <header class="session-panel-header">
          <div>
            <h2 class="life-section-title">{{ copy.session.resultTitle }}</h2>
          </div>
        </header>
        <div class="session-result-options" role="radiogroup" :aria-label="copy.session.resultTitle">
          <button
            v-for="participant in props.agreement.participants"
            :key="participant.id"
            type="button"
            class="session-result-option"
            :class="{ selected: selectedWinnerId === participant.id }"
            role="radio"
            :aria-checked="selectedWinnerId === participant.id"
            @click="selectedWinnerId = participant.id"
          >
            <span class="session-result-radio" aria-hidden="true">
              <Check v-if="selectedWinnerId === participant.id" :size="13" :stroke-width="3" />
            </span>
            <span class="session-result-person">
              <small>{{ participant.role === "initiator" ? copy.contract.partyA : copy.contract.partyB }}</small>
              <strong>{{ participant.nickname }}</strong>
            </span>
            <span class="session-result-label">{{ copy.session.winnerChoice }}</span>
          </button>
        </div>
        <p class="session-result-disclaimer">{{ copy.session.resultDisclaimer }}</p>
      </section>
    </div>

    <LifeActionBar>
      <BaseButton size="lg" :disabled="!selectedWinnerId" @click="submitResult">
        <CheckCircle2 :size="18" />
        {{ copy.session.settle }}
      </BaseButton>
    </LifeActionBar>
  </section>
</template>
