<script setup lang="ts">
import { copy } from "@playbit/content";
import type { Agreement } from "@playbit/shared";
import { computed, ref, watch } from "vue";
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
  }>(),
  {
    compact: false,
    showSeal: true
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
const stamping = ref(false);
const statusTone = computed(() => getAgreementStatusTone(props.agreement.status));
const statusLabel = computed(() => getAgreementStatusLabel(props.agreement.status));
const effectiveStakeLabel = computed(() => getEffectiveStakeLabel(props.agreement));
const agreementDate = computed(() => {
  const date = new Date(props.agreement.createdAt);
  if (Number.isNaN(date.getTime())) {
    return props.agreement.createdAt;
  }
  return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月 ${date.getDate()} 日`;
});

watch(signed, (value, previous) => {
  if (value && previous === false) {
    stamping.value = false;
    requestAnimationFrame(() => {
      stamping.value = true;
    });
  }
}, { immediate: true });
</script>

<template>
  <article class="contract-document" :class="{ compact, 'is-stamping': stamping }">
    <div class="contract-document-rule" />

    <div class="contract-document-meta">
      <span>{{ copy.contract.agreementNo }} {{ props.agreement.shareCode }}</span>
      <BaseBadge :tone="statusTone">{{ statusLabel }}</BaseBadge>
    </div>

    <h2 class="contract-document-title">
      {{ copy.contract.titlePrefix }}{{ props.agreement.title }}{{ copy.contract.titleSuffix }}
    </h2>

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

    <p class="contract-preface">{{ copy.contract.articles.spirit }}</p>

    <section class="contract-clause">
      <h3>{{ copy.contract.articleLabels.first }} {{ copy.contract.clauseTitles.subject }}</h3>
      <p>
        {{ copy.contract.clauseSentences.subjectPrefix }}
        <strong class="contract-inline-value">{{ props.agreement.challenge }}</strong>
        {{ copy.contract.clauseSentences.subjectSuffix }}
      </p>
    </section>

    <section class="contract-clause">
      <h3>{{ copy.contract.articleLabels.second }} {{ copy.contract.clauseTitles.judgment }}</h3>
      <p>
        {{ copy.contract.clauseSentences.judgmentPrefix }}
        {{ copy.contract.clauseSentences.judgmentSuffix }}
      </p>
    </section>

    <section class="contract-clause">
      <h3>{{ copy.contract.articleLabels.third }} {{ copy.contract.clauseTitles.stake }}</h3>
      <p>
        {{ copy.contract.stakePrefix }}
        <strong class="contract-inline-value">{{ effectiveStakeLabel }}</strong>
        {{ copy.contract.stakeSuffix }}
      </p>
    </section>

    <section class="contract-clause">
      <h3>{{ copy.contract.articleLabels.fourth }} {{ copy.contract.clauseTitles.exception }}</h3>
      <p>{{ copy.contract.articles.exception }}</p>
    </section>

    <section class="contract-clause">
      <h3>{{ copy.contract.articleLabels.fifth }} {{ copy.contract.clauseTitles.effective }}</h3>
      <p>{{ copy.contract.articles.effective }}</p>
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
      <section class="contract-signature-box">
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

    <div v-if="showSeal" class="contract-seal" :class="{ pending: !signed, 'is-stamping': stamping }">
      {{ signed ? copy.contract.seal : copy.contract.pendingSeal }}
    </div>
  </article>
</template>
