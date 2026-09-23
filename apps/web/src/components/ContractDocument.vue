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
const statusLabel = computed(() => getSessionStatusLabel(props.session.status));
const effectiveStakeLabel = computed(() => getEffectiveStakeLabel(props.session));
const agreementDate = computed(() => {
  const date = new Date(props.session.createdAt);
  if (Number.isNaN(date.getTime())) {
    return props.session.createdAt;
  }
  return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月 ${date.getDate()} 日`;
});
</script>

<template>
  <article class="contract-document" :class="{ compact }">
    <div class="contract-document-rule" />

    <div class="contract-document-meta">
      <span>{{ copy.contract.agreementNo }} {{ props.session.shareCode }}</span>
      <BaseBadge :tone="statusTone">{{ statusLabel }}</BaseBadge>
    </div>

    <h2 class="contract-document-title">
      {{ copy.contract.titlePrefix }}{{ props.session.title }}{{ copy.contract.titleSuffix }}
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
        <strong class="contract-inline-value">{{ props.session.challenge }}</strong>
        {{ copy.contract.clauseSentences.subjectSuffix }}
      </p>
    </section>

    <section class="contract-clause">
      <h3>{{ copy.contract.articleLabels.second }} {{ copy.contract.clauseTitles.judgment }}</h3>
      <p>
        {{ copy.contract.clauseSentences.judgmentPrefix }}
        <strong class="contract-inline-value">{{ props.session.judgmentRule }}</strong>
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

    <table class="contract-summary-table">
      <thead>
        <tr>
          <th>{{ copy.contract.summaryTable.item }}</th>
          <th>{{ copy.contract.summaryTable.content }}</th>
          <th>{{ copy.contract.summaryTable.note }}</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th>{{ copy.contract.clauseTitles.subject }}</th>
          <td>{{ props.session.challenge }}</td>
          <td>{{ copy.contract.summaryTable.subjectNote }}</td>
        </tr>
        <tr>
          <th>{{ copy.contract.clauseTitles.judgment }}</th>
          <td>{{ props.session.judgmentRule }}</td>
          <td>{{ copy.contract.summaryTable.judgmentNote }}</td>
        </tr>
        <tr>
          <th>{{ copy.contract.clauseTitles.stake }}</th>
          <td>{{ effectiveStakeLabel }}</td>
          <td>{{ copy.contract.summaryTable.stakeNote }}</td>
        </tr>
        <tr>
          <th>{{ copy.contract.summaryTable.status }}</th>
          <td>{{ statusLabel }}</td>
          <td>{{ copy.contract.summaryTable.statusNote }}</td>
        </tr>
      </tbody>
    </table>

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

    <div v-if="showSeal" class="contract-seal" :class="{ pending: !signed }">
      {{ signed ? copy.contract.seal : copy.contract.pendingSeal }}
    </div>
  </article>
</template>
