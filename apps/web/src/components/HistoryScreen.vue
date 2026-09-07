<script setup lang="ts">
import type { BetSession } from "@playbit/shared";
import { ArrowLeft } from "lucide-vue-next";
import BaseButton from "./ui/BaseButton.vue";

defineProps<{
  sessions: BetSession[];
}>();

const emit = defineEmits<{
  back: [];
  open: [session: BetSession];
}>();
</script>

<template>
  <section class="screen">
    <div class="topbar">
      <BaseButton variant="outline" class="w-auto min-h-9 px-3" @click="emit('back')">
        <ArrowLeft :size="17" />
        返回
      </BaseButton>
      <span class="muted">历史</span>
    </div>

    <h2 class="section-title">我的赌约</h2>
    <div v-if="sessions.length === 0" class="challenge-card">
      <span class="card-label">暂无记录</span>
      <h3 class="card-name">第一局还没开始</h3>
      <p class="card-content">生活里下一次“赌不赌”，就可以记在这里。</p>
    </div>
    <div v-for="session in sessions" :key="session.id" class="challenge-card" @click="emit('open', session)">
      <span class="card-label">{{ session.status }}</span>
      <h3 class="card-name">{{ session.title }}</h3>
      <p class="hero-copy">赌注：{{ session.stake.label }}</p>
    </div>
  </section>
</template>
