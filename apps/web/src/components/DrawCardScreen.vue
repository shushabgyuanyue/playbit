<script setup lang="ts">
import { copy } from "@playbit/content";
import type { Card, CreateAgreementInput, Stake, User } from "@playbit/shared";
import { ArrowRight, Clock3, RefreshCcw } from "lucide-vue-next";
import { reactive, ref, watch } from "vue";
import BaseBadge from "./ui/BaseBadge.vue";
import BaseButton from "./ui/BaseButton.vue";
import CardReveal from "./ui/CardReveal.vue";
import LifeActionBar from "./ui/LifeActionBar.vue";
import LifeServiceHero from "./ui/LifeServiceHero.vue";
import StakePicker from "./StakePicker.vue";
import SignaturePad from "./ui/SignaturePad.vue";

const props = defineProps<{
  card: Card | null;
  loading: boolean;
  user: User | null;
}>();

const emit = defineEmits<{
  back: [];
  draw: [];
  upgrade: [];
  createAgreement: [payload: CreateAgreementInput];
}>();

const form = reactive({
  stake: {
    type: "coupon",
    label: copy.stakes.presets[1]?.label ?? copy.stakes.presets[0].label,
    fulfilled: false,
    additions: []
  } as Stake,
  creatorSignatureDataUrl: props.user?.signatureDataUrl ?? ""
});
const agreementOpen = ref(false);

watch(
  () => props.card?.id,
  () => {
    agreementOpen.value = false;
  }
);

watch(
  () => props.user?.signatureDataUrl,
  (signature) => {
    if (signature && !form.creatorSignatureDataUrl) {
      form.creatorSignatureDataUrl = signature;
    }
  }
);

function openUpgrade() {
  agreementOpen.value = true;
  emit("upgrade");
}

function createAgreement() {
  if (!props.card || props.card.mode !== "versus") {
    return;
  }

  emit("createAgreement", {
    source: "card",
    creatorNickname: copy.common.initiator,
    creatorSignatureDataUrl: form.creatorSignatureDataUrl,
    title: props.card.name,
    challenge: `${props.card.content}\n${copy.draw.agreementChallengeRule}${props.card.winCondition}`,
    stake: form.stake,
    cardId: props.card.id
  });
}
</script>

<template>
  <section class="life-page service-flow-page draw-page">
    <LifeServiceHero
      class="service-flow-hero"
      :title="copy.draw.title"
      :show-back="true"
      :back-label="copy.common.back"
      @back="emit('back')"
    />

    <div class="life-page-content service-flow-content">
      <section class="challenge-document">
        <template v-if="props.card">
          <div class="challenge-card-meta">
            <div class="challenge-card-tags">
              <BaseBadge tone="contract">{{ copy.draw.cardLabel }}</BaseBadge>
              <BaseBadge :tone="props.card.mode === 'versus' ? 'pending' : 'success'">
                {{ props.card.mode === 'versus' ? copy.draw.versusLabel : copy.draw.togetherLabel }}
              </BaseBadge>
            </div>
            <span class="challenge-duration"><Clock3 :size="14" aria-hidden="true" />{{ props.card.durationMinutes }} {{ copy.draw.durationUnit }}</span>
          </div>
          <h2 class="challenge-title">{{ props.card.name }}</h2>
          <p class="challenge-content">{{ props.card.content }}</p>
          <ul class="life-info-list">
            <li>
              <span>{{ copy.draw.winCondition }}</span>
              <strong>{{ props.card.winCondition }}</strong>
            </li>
          </ul>
          <CardReveal v-if="props.card.reveal" :key="props.card.id" :answer="props.card.reveal" />
        </template>
        <template v-else>
          <BaseBadge tone="contract">{{ copy.draw.emptyLabel }}</BaseBadge>
          <h2 class="challenge-title">{{ copy.draw.emptyTitle }}</h2>
          <p class="challenge-content">{{ copy.draw.emptyContent }}</p>
        </template>
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
          :variant="props.card ? 'outline' : 'primary'"
          size="lg"
          :loading="props.loading"
          :disabled="props.loading"
          @click="emit('draw')"
        >
          <RefreshCcw :size="18" />
          {{ props.card ? copy.draw.reroll : copy.draw.drawNow }}
        </BaseButton>
        <BaseButton
          v-if="props.card?.mode === 'versus' && !agreementOpen"
          size="lg"
          variant="secondary"
          @click="openUpgrade"
        >
          <ArrowRight :size="18" />
          {{ copy.draw.addAgreement }}
        </BaseButton>
        <BaseButton
          v-else-if="props.card && agreementOpen"
          size="lg"
          :disabled="!props.card || !form.creatorSignatureDataUrl"
          @click="createAgreement"
        >
          <ArrowRight :size="18" />
          {{ copy.draw.createAgreement }}
        </BaseButton>
      </div>
    </LifeActionBar>
  </section>
</template>
