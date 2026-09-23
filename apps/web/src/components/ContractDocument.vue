<script setup lang="ts">
import { copy } from "@playbit/content";
import type { BetSession } from "@playbit/shared";
import { computed } from "vue";
import {
  getParticipantName,
  getEffectiveStakeLabel,
  getSessionStatusLabel,
  getSessionStatusTone,
  isCounterpartySigned
} from "../utils/sessionDisplay";
import BaseBadge from "./ui/BaseBadge.vue";

const props = withDefaults(
  defineProps<{
    session: BetSession;
    compact?: boolean;
    showSeal?: boolean;
  }>(),
  {
    compact: false,
    showSeal: true
  }
);

const initiatorParticipant = computed(() =>
  props.session.participants.find((participant) => participant.role === "initiator")
);
const counterpartyParticipant = computed(() =>
  props.session.participants.find((participant) => participant.role === "counterparty")
);
const initiator = computed(() => getParticipantName(props.session, "initiator", copy.contract.fallbackInitiator));
const counterparty = computed(() =>
  getParticipantName(props.session, "counterparty", copy.contract.fallbackCounterparty)
);
const signed = computed(() => isCounterpartySigned(props.session));
const statusTone = computed(() => getSessionStatusTone(props.session.status));
const effectiveStakeLabel = computed(() => getEffectiveStakeLabel(props.session));
const articles = computed(() => [
  copy.contract.articles.spirit,
  `${copy.contract.articleLabels.first}：${props.session.challenge}`,
  `${copy.contract.articleLabels.second}：${props.session.judgmentRule}`,
  `${copy.contract.articleLabels.third}：${copy.contract.stakePrefix}「${effectiveStakeLabel.value}」${copy.contract.stakeSuffix}`,
  `${copy.contract.articleLabels.fourth}：${copy.contract.articles.exception}`,
  `${copy.contract.articleLabels.fifth}：${copy.contract.articles.effective}`
]);
</script>

<template>
  <article class="contract-document" :class="{ compact }">
    <div class="contract-document-meta">
      <span>{{ copy.contract.agreementNo }} {{ props.session.shareCode }}</span>
      <BaseBadge :tone="statusTone">{{ getSessionStatusLabel(props.session.status) }}</BaseBadge>
    </div>

    <h2 class="contract-document-title">
      {{ copy.contract.titlePrefix }}{{ props.session.title }}{{ copy.contract.titleSuffix }}
    </h2>

    <div class="contract-party-grid">
      <span>{{ copy.contract.partyA }}：{{ initiator }}</span>
      <span>{{ copy.contract.partyB }}：{{ counterparty }}</span>
    </div>

    <ol class="contract-article-list">
      <li v-for="article in articles" :key="article">{{ article }}</li>
    </ol>

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

    <div v-if="showSeal" class="contract-seal" :class="{ pending: !signed }">
      {{ signed ? copy.contract.seal : copy.contract.pendingSeal }}
    </div>
  </article>
</template>
