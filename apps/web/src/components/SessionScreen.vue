<script setup lang="ts">
import { copy } from "@playbit/content";
import type { Agreement, Coupon, Stake } from "@playbit/shared";
import { BadgePlus, Check, CheckCircle2, ChevronDown, ChevronUp, Clock3 } from "lucide-vue-next";
import { computed, nextTick, ref, watch } from "vue";
import pandaPkBackground from "../assets/pk-panda.png";
import rabbitPkBackground from "../assets/pk-rabbit.png";
import { buildVoucherItems } from "../composables/useVoucherAssets";
import { getEffectiveStakeLabel } from "../utils/sessionDisplay";
import { formatVoucherBenefit, inferVoucherKind } from "../utils/voucherDisplay";
import AgreementProgress from "./AgreementProgress.vue";
import BaseBadge from "./ui/BaseBadge.vue";
import BaseButton from "./ui/BaseButton.vue";
import BrandSeal from "./ui/BrandSeal.vue";
import LifeActionBar from "./ui/LifeActionBar.vue";
import LifeServiceHero from "./ui/LifeServiceHero.vue";
import StakePicker from "./StakePicker.vue";
import VoucherTicket from "./ui/VoucherTicket.vue";

const props = defineProps<{
  agreement: Agreement;
  coupons: Coupon[];
  currentUserId: string | null;
}>();

const emit = defineEmits<{
  back: [];
  home: [];
  settle: [winnerId: string];
  addBoost: [label: string];
  confirmBoost: [boostId: string];
}>();

const boostOpen = ref(false);
const resultOpen = ref(false);
const vouchersOpen = ref(false);
const boostPicker = ref<InstanceType<typeof StakePicker> | null>(null);
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
const currentStakeBenefit = computed(() => formatVoucherBenefit(effectiveStake.value));
const currentStakeKind = computed(() => inferVoucherKind(effectiveStake.value));
const agreementVouchers = computed(() => buildVoucherItems(
  [props.agreement],
  props.coupons.filter((coupon) => coupon.agreementId === props.agreement.id && Boolean(coupon.sourceFlipId)),
  props.currentUserId
));
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

async function openBoostPicker() {
  if (!canAddBoost.value) {
    return;
  }
  boostOpen.value = true;
  await nextTick();
  boostPicker.value?.open();
}

function submitBoost() {
  const label = boostStake.value.label.trim();
  if (!label || boostIncomplete.value) {
    return;
  }
  emit("addBoost", label);
  boostStake.value = { type: "custom", label: "", fulfilled: false, additions: [] };
  boostOpen.value = false;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

watch(
  () => props.agreement.id,
  () => {
    selectedWinnerId.value = null;
    boostOpen.value = false;
    resultOpen.value = false;
    vouchersOpen.value = false;
  }
);
</script>

<template>
  <section class="life-page service-flow-page">
    <LifeServiceHero
      class="service-flow-hero"
      :title="copy.session.navTitle"
      :show-back="true"
      :show-home="true"
      :back-label="copy.common.back"
      :home-label="copy.common.home"
      @back="emit('back')"
      @home="emit('home')"
    />

    <div class="life-page-content service-flow-content">
      <AgreementProgress :agreement="props.agreement" />

      <section class="session-brief" aria-labelledby="session-brief-title">
        <BrandSeal class="session-brief-seal" />
        <header class="session-brief-header">
          <div>
            <span class="session-brief-kicker">{{ copy.session.briefLabel }}</span>
            <h1 id="session-brief-title">{{ props.agreement.title }}</h1>
          </div>
          <BaseBadge tone="success">{{ copy.session.active }}</BaseBadge>
        </header>

        <div class="session-brief-identifiers">
          <span>{{ copy.contract.agreementNo }} {{ props.agreement.shareCode }}</span>
          <time :datetime="props.agreement.createdAt">{{ formatDateTime(props.agreement.createdAt) }}</time>
        </div>

        <div v-if="hasSeparateChallenge" class="session-brief-subject">
          <span>{{ copy.session.subjectLabel }}</span>
          <p>{{ props.agreement.challenge }}</p>
        </div>

        <div class="session-brief-stake">
          <div class="session-brief-stake-heading">
            <span>{{ copy.session.currentStake }}</span>
            <strong>{{ effectiveStake }}</strong>
          </div>
          <VoucherTicket
            class="session-current-ticket"
            :kind="currentStakeKind"
            status="pending"
            size="mini"
            watermark="panda"
          >
            <template #value>
              <strong>{{ currentStakeBenefit.title }}</strong>
              <span>{{ currentStakeBenefit.subtitle }}</span>
            </template>
            <div class="session-current-ticket-copy">
              <strong>{{ effectiveStake }}</strong>
            </div>
          </VoucherTicket>
        </div>

        <section v-if="agreementVouchers.length" class="session-linked-vouchers" aria-labelledby="linked-vouchers-title">
          <button
            type="button"
            class="session-linked-vouchers-toggle"
            :aria-expanded="vouchersOpen"
            @click="vouchersOpen = !vouchersOpen"
          >
            <span>
              <strong id="linked-vouchers-title">{{ copy.vouchers.ticketCaption }}</strong>
              <small>{{ copy.vouchers.ticketCount(agreementVouchers.length) }}</small>
            </span>
            <ChevronUp v-if="vouchersOpen" :size="16" aria-hidden="true" />
            <ChevronDown v-else :size="16" aria-hidden="true" />
          </button>
          <div v-if="vouchersOpen" class="session-linked-voucher-grid">
            <VoucherTicket
              v-for="voucher in agreementVouchers"
              :key="voucher.id"
              :kind="voucher.kind"
              :status="voucher.status"
              size="mini"
              :watermark="voucher.status === 'used' ? 'rabbit' : 'panda'"
            >
              <template #value>
                <strong>{{ voucher.benefitTitle }}</strong>
                <span>{{ voucher.benefitSubtitle }}</span>
              </template>
              <div class="session-linked-voucher-copy">
                <strong>{{ voucher.agreementTitle }}</strong>
                <small>{{ voucher.timeText }}</small>
              </div>
            </VoucherTicket>
          </div>
        </section>

        <section class="session-brief-boost" aria-labelledby="session-boost-title">
          <header class="session-panel-header">
            <div>
              <h2 id="session-boost-title" class="life-section-title">{{ copy.session.enhancementTitle }}</h2>
              <p class="session-panel-meta">{{ props.agreement.boosts.length }} / 3</p>
            </div>
            <button
              type="button"
              class="session-boost-trigger"
              :disabled="!canAddBoost"
              :aria-expanded="boostOpen"
              @click="openBoostPicker"
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
            <StakePicker ref="boostPicker" :title="copy.session.boost" compact @change="boostStake = $event" />
            <BaseButton
              class="session-boost-submit"
              size="sm"
              variant="danger"
              :disabled="!boostStake.label.trim() || boostIncomplete"
              @click="submitBoost"
            >
              {{ copy.session.boostSubmit }}
            </BaseButton>
          </div>
          <p v-if="!canAddBoost" class="session-boost-limit">{{ copy.session.boostLimit }}</p>
        </section>
      </section>

      <section v-if="resultOpen" class="life-panel session-result-panel">
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
            :data-party="participant.role"
            :style="{ '--session-result-art': `url(${participant.role === 'initiator' ? pandaPkBackground : rabbitPkBackground})` }"
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
          <span v-if="props.agreement.participants.length > 1" class="session-result-vs" aria-hidden="true">VS</span>
        </div>
        <p class="session-result-disclaimer">{{ copy.session.resultDisclaimer }}</p>
      </section>
    </div>

    <LifeActionBar>
      <BaseButton v-if="!resultOpen" size="lg" @click="resultOpen = true">
        <CheckCircle2 :size="18" />
        {{ copy.session.settle }}
      </BaseButton>
      <BaseButton v-else size="lg" :disabled="!selectedWinnerId" @click="submitResult">
        <CheckCircle2 :size="18" />
        {{ copy.session.settle }}
      </BaseButton>
    </LifeActionBar>
  </section>
</template>
