<script setup lang="ts">
import { copy } from "@playbit/content";
import type { Card, CreateSessionInput, Stake } from "@playbit/shared";
import { Check, RefreshCcw } from "lucide-vue-next";
import { reactive } from "vue";
import BaseBadge from "./ui/BaseBadge.vue";
import BaseButton from "./ui/BaseButton.vue";
import LifeActionBar from "./ui/LifeActionBar.vue";
import LifeAppBar from "./ui/LifeAppBar.vue";
import StakePicker from "./StakePicker.vue";

const props = defineProps<{
  card: Card | null;
  loading: boolean;
}>();

const emit = defineEmits<{
  back: [];
  draw: [];
  accept: [payload: CreateSessionInput];
}>();

const form = reactive({
  stake: {
    type: "coupon",
    label: "请奶茶一杯",
    fulfilled: false
  } as Stake
});

function accept() {
  if (!props.card) {
    return;
  }

  emit("accept", {
    source: "card",
    creatorNickname: "发起方",
    title: props.card.name,
    challenge: props.card.content,
    judgmentRule: props.card.winCondition,
    stake: form.stake,
    cardId: props.card.id
  });
}
</script>

<template>
  <section class="life-page">
    <LifeAppBar :title="copy.draw.navTitle" :show-back="true" :back-label="copy.common.back" @back="emit('back')" />

    <div class="life-page-content">
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

      <StakePicker @change="form.stake = $event" />
    </div>

    <LifeActionBar>
      <div class="life-inline-actions">
        <BaseButton variant="outline" size="lg" :disabled="props.loading" @click="emit('draw')">
          <RefreshCcw :size="18" />
          {{ copy.draw.reroll }}
        </BaseButton>
        <BaseButton size="lg" :disabled="!props.card" @click="accept">
          <Check :size="18" />
          {{ copy.draw.accept }}
        </BaseButton>
      </div>
    </LifeActionBar>
  </section>
</template>
