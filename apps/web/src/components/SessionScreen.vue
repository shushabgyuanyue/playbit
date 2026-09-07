<script setup lang="ts">
import type { BetSession } from "@playbit/shared";
import { ArrowLeft, BadgePlus, ShieldCheck, Trophy } from "lucide-vue-next";
import BaseButton from "./ui/BaseButton.vue";

const props = defineProps<{
  session: BetSession;
}>();

const emit = defineEmits<{
  back: [];
  settle: [winnerId: string, fulfilled: boolean];
}>();
</script>

<template>
  <section class="screen">
    <div class="topbar">
      <BaseButton variant="outline" class="w-auto min-h-9 px-3" @click="emit('back')">
        <ArrowLeft :size="17" />
        返回
      </BaseButton>
      <span class="muted">进行中</span>
    </div>

    <div class="challenge-card">
      <span class="card-label">本局进行中</span>
      <h2 class="card-name">{{ props.session.title }}</h2>
      <p class="card-content">{{ props.session.challenge }}</p>
      <p class="hero-copy">判定：{{ props.session.judgmentRule }}</p>
      <p class="hero-copy">赌注：{{ props.session.stake.label }}</p>
    </div>

    <h3 class="section-title">局内增强</h3>
    <div class="quiet-row">
      <BaseButton variant="outline">
        <BadgePlus :size="17" />
        加码
      </BaseButton>
      <BaseButton variant="outline">
        <ShieldCheck :size="17" />
        银弹
      </BaseButton>
    </div>

    <div class="bottom-actions">
      <BaseButton
        v-for="participant in props.session.participants"
        :key="participant.id"
        size="lg"
        @click="emit('settle', participant.id, false)"
      >
        <Trophy :size="18" />
        判定 {{ participant.nickname }} 获胜
      </BaseButton>
    </div>
  </section>
</template>
