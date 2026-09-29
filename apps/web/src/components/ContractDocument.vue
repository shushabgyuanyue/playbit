<script setup lang="ts">
import { copy } from "@playbit/content";
import type { Agreement } from "@playbit/shared";
import { computed, onMounted, ref } from "vue";
import { useVisibleStamp } from "../composables/useVisibleStamp";
import {
  getParticipantName,
  getEffectiveStakeLabel,
  getAgreementStatusLabel,
  getAgreementStatusTone,
  isCounterpartySigned
} from "../utils/sessionDisplay";
import BaseBadge from "./ui/BaseBadge.vue";

const props = withDefaults(
  defineProps<{
    agreement: Agreement;
    compact?: boolean;
    showSeal?: boolean;
    reveal?: boolean;
    exporting?: boolean;
  }>(),
  {
    compact: false,
    showSeal: true,
    reveal: false
  }
);

const initiatorParticipant = computed(() =>
  props.agreement.participants.find((participant) => participant.role === "initiator")
);
const counterpartyParticipant = computed(() =>
  props.agreement.participants.find((participant) => participant.role === "counterparty")
);
const initiator = computed(() => getParticipantName(props.agreement, "initiator", copy.contract.fallbackInitiator));
const counterparty = computed(() =>
  getParticipantName(props.agreement, "counterparty", copy.contract.fallbackCounterparty)
);
const signed = computed(() => isCounterpartySigned(props.agreement));
const signatureTarget = ref<HTMLElement | null>(null);
const stamping = useVisibleStamp(signatureTarget, () => signed.value && props.showSeal && !props.exporting, () => props.agreement.id);
const statusTone = computed(() => getAgreementStatusTone(props.agreement.status));
const statusLabel = computed(() => getAgreementStatusLabel(props.agreement.status));
const effectiveStakeLabel = computed(() => getEffectiveStakeLabel(props.agreement));
const subject = computed(() => {
  const text = props.agreement.challenge.trim();
  return /[。！？.!?]$/.test(text) ? text : `${text}${copy.contract.clauseSentences.subjectSuffix}`;
});
const protocolLines = computed(() => [
  `${copy.contract.clauseSentences.subjectPrefix} ${subject.value}`,
  `${copy.contract.clauseSentences.judgmentPrefix} ${copy.contract.clauseSentences.judgmentSuffix}`,
  `${copy.contract.stakePrefix} ${effectiveStakeLabel.value}${copy.contract.stakeSuffix}`,
  copy.contract.articles.exception,
  copy.contract.articles.effective
]);
const revealed = ref(!props.reveal);
const agreementDate = computed(() => {
  const date = new Date(props.agreement.createdAt);
  if (Number.isNaN(date.getTime())) {
    return props.agreement.createdAt;
  }
  return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月 ${date.getDate()} 日`;
});

onMounted(() => {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!props.reveal || reducedMotion) {
    revealed.value = true;
    return;
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      revealed.value = true;
    });
  });
});
</script>

<template>
  <article
    class="contract-document"
    :class="{ compact, 'is-exporting': exporting, 'is-reveal-enabled': props.reveal, 'is-revealed': revealed }"
  >
    <div class="contract-document-rule" />

    <div class="contract-document-meta">
      <span>{{ copy.contract.agreementNo }} {{ props.agreement.shareCode }}</span>
      <BaseBadge v-if="!exporting" :tone="statusTone">{{ statusLabel }}</BaseBadge>
    </div>

    <h2 class="contract-document-title">
      {{ copy.contract.documentTitle }}
    </h2>
    <p class="contract-document-subtitle">{{ copy.contract.documentSubtitle }}</p>

    <dl class="contract-field-list">
      <div>
        <dt>{{ copy.contract.signedDate }}：</dt>
        <dd><span class="contract-underline">{{ agreementDate }}</span></dd>
      </div>
      <div>
        <dt>{{ copy.contract.partyA }}：</dt>
        <dd><span class="contract-underline">{{ initiator }}</span></dd>
      </div>
      <div>
        <dt>{{ copy.contract.partyB }}：</dt>
        <dd><span class="contract-underline">{{ counterparty }}</span></dd>
      </div>
    </dl>

    <p class="contract-preface contract-reveal-item" style="--contract-reveal-delay: 80ms">
      {{ copy.contract.articles.spirit }}
    </p>
    <p class="contract-product-note contract-reveal-item" style="--contract-reveal-delay: 150ms">
      {{ copy.contract.productLine }}
    </p>

    <section class="contract-clause contract-agreement-clause contract-reveal-item" style="--contract-reveal-delay: 220ms">
      <h3>{{ copy.contract.articleLabels.first }} {{ copy.contract.clauseTitles.subject }}</h3>
      <p class="contract-agreement-highlight">{{ protocolLines[0] }}</p>
    </section>

    <section class="contract-clause contract-reveal-item" style="--contract-reveal-delay: 300ms">
      <h3>{{ copy.contract.articleLabels.second }} {{ copy.contract.clauseTitles.judgment }}</h3>
      <p>{{ protocolLines[1] }}</p>
    </section>

    <section class="contract-clause contract-reveal-item" style="--contract-reveal-delay: 380ms">
      <h3>{{ copy.contract.articleLabels.third }} {{ copy.contract.clauseTitles.stake }}</h3>
      <p>{{ protocolLines[2] }}</p>
    </section>

    <section class="contract-clause contract-reveal-item" style="--contract-reveal-delay: 460ms">
      <h3>{{ copy.contract.articleLabels.fourth }} {{ copy.contract.clauseTitles.exception }}</h3>
      <p>{{ protocolLines[3] }}</p>
    </section>

    <section class="contract-clause contract-reveal-item" style="--contract-reveal-delay: 540ms">
      <h3>{{ copy.contract.articleLabels.fifth }} {{ copy.contract.clauseTitles.effective }}</h3>
      <p>{{ protocolLines[4] }}</p>
    </section>

    <div class="contract-signature-grid">
      <section class="contract-signature-box">
        <span>{{ copy.contract.confirmA }}</span>
        <strong>{{ initiator }}</strong>
        <img
          v-if="initiatorParticipant?.signatureDataUrl"
          :src="initiatorParticipant.signatureDataUrl"
          :alt="copy.contract.confirmA"
        />
        <em v-else class="contract-signature-placeholder">{{ copy.contract.signaturePending }}</em>
      </section>
      <section ref="signatureTarget" class="contract-signature-box contract-signature-counterparty">
        <div v-if="showSeal && signed" class="contract-seal" :class="{ 'is-stamping': stamping && !exporting, 'is-visible': stamping || exporting }" :aria-hidden="!stamping && !exporting">
          <small>{{ copy.contract.sealEyebrow }}</small><b>{{ copy.contract.seal }}</b><small>{{ copy.contract.sealFooter }}</small>
        </div>
        <span>{{ copy.contract.confirmB }}</span>
        <strong>{{ counterparty }}</strong>
        <img
          v-if="counterpartyParticipant?.signatureDataUrl"
          :src="counterpartyParticipant.signatureDataUrl"
          :alt="copy.contract.confirmB"
        />
        <em v-else class="contract-signature-placeholder">{{ copy.contract.signaturePending }}</em>
      </section>
    </div>

    <p class="contract-record-note">{{ copy.contract.recordNote }}</p>

    <footer v-if="$slots.actions" class="contract-document-actions">
      <slot name="actions" />
    </footer>
  </article>
</template>

<style scoped>
.contract-document-subtitle { margin: -5px 0 22px; text-align: center; font-family: var(--pb-font-serif); font-size: var(--pb-font-xs); color: var(--pb-text-2); }
.contract-record-note { margin: 18px 0 0; border-top: 1px solid var(--pb-line); padding-top: 10px; font-size: var(--pb-font-xs); line-height: 1.6; color: var(--pb-text-2); }
</style>
