<script setup lang="ts">
import { copy } from "@playbit/content";
import type { Card, CreateSessionInput, Stake, User } from "@playbit/shared";
import { Check, RefreshCcw } from "lucide-vue-next";
import { reactive } from "vue";
import BaseBadge from "./ui/BaseBadge.vue";
import BaseButton from "./ui/BaseButton.vue";
import LifeActionBar from "./ui/LifeActionBar.vue";
import LifeServiceHero from "./ui/LifeServiceHero.vue";
import StakePicker from "./StakePicker.vue";
import SignaturePad from "./ui/SignaturePad.vue";
import { ref, watch } from "vue";

const props = defineProps<{
  card: Card | null;
  loading: boolean;
  user: User | null;
}>();

const emit = defineEmits<{
  back: [];
  draw: [];
  createAgreement: [payload: CreateSessionInput];
}>();

const form = reactive({
  stake: {
    type: "coupon",
    label: copy.stakes.presets[1]?.label ?? copy.stakes.presets[0].label,
    fulfilled: false
  } as Stake,
  creatorSignatureDataUrl: props.user?.signatureDataUrl ?? ""
});
const accepted = ref(Boolean(props.card));
const agreementOpen = ref(false);

watch(
  () => props.card?.id,
  (cardId) => {
    accepted.value = Boolean(cardId);
    agreementOpen.value = false;
  }
);

function createAgreement() {
  if (!props.card) {
    return;
  }

  emit("createAgreement", {
    source: "card",
    creatorNickname: copy.common.initiator,
    creatorSignatureDataUrl: form.creatorSignatureDataUrl,
    title: props.card.name,
    challenge: props.card.content,
    judgmentRule: props.card.winCondition,
    stake: form.stake,
    cardId: props.card.id
  });
}
</script>

<template>
  <section class="life-page service-flow-page">
    <LifeServiceHero
      class="service-flow-hero"
      :eyebrow="copy.draw.eyebrow"
      :title="copy.draw.title"
      :show-back="true"
      :back-label="copy.common.back"
      @back="emit('back')"
    />

    <div class="life-page-content service-flow-content">
      <section class="challenge-document">
        <template v-if="props.card">
          <BaseBadge tone="contract">{{ props.card.mechanism }}</BaseBadge>
          <h2 class="challenge-title">{{ props.card.name }}</h2>
          <p class="challenge-content">{{ props.card.content }}</p>
          <ul class="life-info-list">
            <li>
              <span>{{ copy.draw.winCondition }}</span>
              <strong>{{ props.card.winCondition }}</strong>
            </li>
          </ul>
        </template>
        <template v-else>
          <BaseBadge tone="contract">{{ copy.draw.emptyLabel }}</BaseBadge>
          <h2 class="challenge-title">{{ copy.draw.emptyTitle }}</h2>
          <p class="challenge-content">{{ copy.draw.emptyContent }}</p>
        </template>
      </section>

      <section v-if="accepted" class="life-panel challenge-accepted-panel">
        <BaseBadge tone="success">{{ copy.draw.accepted }}</BaseBadge>
        <h2 class="life-section-title">{{ copy.draw.accepted }}</h2>
        <p class="life-section-caption">{{ copy.draw.acceptedHint }}</p>
      </section>

      <section v-if="agreementOpen" class="draw-agreement-upgrade">
        <section class="life-panel">
          <h2 class="life-section-title">{{ copy.draw.addAgreement }}</h2>
          <p class="life-section-caption">{{ copy.draw.agreementHint }}</p>
        </section>
        <StakePicker @change="form.stake = $event" />
        <SignaturePad
          :label="copy.create.signature"
          :model-value="form.creatorSignatureDataUrl"
          @change="form.creatorSignatureDataUrl = $event"
        />
      </section>
    </div>

    <LifeActionBar>
      <div class="life-inline-actions">
        <BaseButton
          variant="outline"
          size="lg"
          :disabled="props.loading || !props.card"
          @click="emit('draw')"
        >
          <RefreshCcw :size="18" />
          {{ copy.draw.reroll }}
        </BaseButton>
        <BaseButton
          v-if="accepted && !agreementOpen"
          size="lg"
          variant="secondary"
          @click="agreementOpen = true"
        >
          <Check :size="18" />
          {{ copy.draw.addAgreement }}
        </BaseButton>
        <BaseButton
          v-else-if="accepted && agreementOpen"
          size="lg"
          :disabled="!props.card || !form.creatorSignatureDataUrl"
          @click="createAgreement"
        >
          <Check :size="18" />
          {{ copy.draw.createSession }}
        </BaseButton>
      </div>
    </LifeActionBar>
  </section>
</template>
