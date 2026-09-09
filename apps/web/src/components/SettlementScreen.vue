<script setup lang="ts">
import { copy } from "@playbit/content";
import { generateSettlementTitle } from "@playbit/game-core";
import type { BetSession } from "@playbit/shared";
import { Copy, Home, Stamp } from "lucide-vue-next";
import { computed } from "vue";
import BaseButton from "./ui/BaseButton.vue";

const props = defineProps<{
  session: BetSession;
}>();

const emit = defineEmits<{
  home: [];
  fulfill: [];
  copyShare: [];
}>();

const winner = computed(
  () => props.session.participants.find((participant) => participant.id === props.session.winnerId)?.nickname ?? "待定"
);
const loser = computed(
  () => props.session.participants.find((participant) => participant.id === props.session.loserId)?.nickname ?? "待定"
);
</script>

<template>
  <section class="screen">
    <article class="settlement-poster">
      <h2 class="poster-title">《{{ generateSettlementTitle(props.session) }}》</h2>
      <ul class="fact-list">
        <li><span>赌局</span><strong>{{ props.session.title }}</strong></li>
        <li><span>胜方</span><strong>{{ winner }}</strong></li>
        <li><span>败方</span><strong>{{ loser }}</strong></li>
        <li><span>赌注</span><strong>{{ props.session.stake.label }} × {{ props.session.stake.quantity }}</strong></li>
        <li><span>状态</span><strong>{{ props.session.stake.fulfilled ? "已履约" : "待履约" }}</strong></li>
      </ul>
    </article>
    <p class="hero-copy">{{ copy.share.screenshotHint }}</p>

    <div class="bottom-actions">
      <BaseButton variant="secondary" size="lg" @click="emit('copyShare')">
        <Copy :size="18" />
        {{ copy.share.copyLink }}
      </BaseButton>
      <BaseButton
        v-if="!props.session.stake.fulfilled"
        size="lg"
        @click="emit('fulfill')"
      >
        <Stamp :size="18" />
        确认履约
      </BaseButton>
      <BaseButton variant="outline" size="lg" @click="emit('home')">
        <Home :size="18" />
        回到首页
      </BaseButton>
    </div>
  </section>
</template>
