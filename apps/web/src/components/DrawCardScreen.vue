<script setup lang="ts">
import type { Card, CreateSessionInput } from "@playbit/shared";
import { ArrowLeft, Check, RefreshCcw } from "lucide-vue-next";
import { reactive } from "vue";
import BaseBadge from "./ui/BaseBadge.vue";
import BaseButton from "./ui/BaseButton.vue";
import BaseField from "./ui/BaseField.vue";

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
  partyA: "我",
  partyB: "",
  stakeLabel: "奶茶券"
});

function accept() {
  if (!props.card) {
    return;
  }

  emit("accept", {
    source: "card",
    partyA: form.partyA,
    partyB: form.partyB || "对方",
    title: props.card.name,
    challenge: props.card.content,
    judgmentRule: props.card.winCondition,
    stake: {
      type: "coupon",
      label: form.stakeLabel,
      quantity: 1,
      fulfilled: false
    },
    cardId: props.card.id
  });
}
</script>

<template>
  <section class="screen">
    <div class="topbar">
      <BaseButton variant="outline" class="w-auto min-h-9 px-3" @click="emit('back')">
        <ArrowLeft :size="17" />
        返回
      </BaseButton>
      <span class="muted">抽卡</span>
    </div>

    <div v-if="props.card" class="challenge-card">
      <BaseBadge>{{ props.card.mechanism }}</BaseBadge>
      <h2 class="card-name">{{ props.card.name }}</h2>
      <p class="card-content">{{ props.card.content }}</p>
      <p class="hero-copy">胜负：{{ props.card.winCondition }}</p>
    </div>

    <div v-else class="challenge-card">
      <BaseBadge>开一局</BaseBadge>
      <h2 class="card-name">抽一张，让现实动一下</h2>
      <p class="card-content">卡片会给当前生活加一条临时规则。</p>
    </div>

    <h3 class="section-title">本局赌注</h3>
    <div class="field-group">
      <BaseField v-model="form.partyA" label="我方" />
      <BaseField v-model="form.partyB" label="对方" placeholder="例如：Gloria" />
      <BaseField v-model="form.stakeLabel" label="赌注" placeholder="例如：奶茶券 ×1" />
    </div>

    <div class="bottom-actions">
      <div class="inline-actions">
        <BaseButton variant="outline" size="lg" :disabled="props.loading" @click="emit('draw')">
          <RefreshCcw :size="18" />
          重抽
        </BaseButton>
        <BaseButton size="lg" :disabled="!props.card" @click="accept">
          <Check :size="18" />
          接受
        </BaseButton>
      </div>
    </div>
  </section>
</template>
