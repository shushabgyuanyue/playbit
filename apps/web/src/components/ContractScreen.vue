<script setup lang="ts">
import { copy } from "@playbit/content";
import { generateContractTitle } from "@playbit/game-core";
import type { BetSession } from "@playbit/shared";
import { ArrowLeft, Copy, Play } from "lucide-vue-next";
import { computed } from "vue";
import BaseButton from "./ui/BaseButton.vue";

const props = defineProps<{
  session: BetSession;
}>();

const emit = defineEmits<{
  back: [];
  start: [];
  copyShare: [];
}>();

const initiator = computed(
  () => props.session.participants.find((participant) => participant.role === "initiator")?.nickname ?? "发起方"
);
const counterparty = computed(
  () => props.session.participants.find((participant) => participant.role === "counterparty")?.nickname ?? "待签约"
);
const signed = computed(() => props.session.participants.some((participant) => participant.role === "counterparty"));
</script>

<template>
  <section class="screen">
    <div class="topbar">
      <BaseButton variant="outline" class="w-auto min-h-9 px-3" @click="emit('back')">
        <ArrowLeft :size="17" />
        返回
      </BaseButton>
      <span class="muted">合同</span>
    </div>

    <article class="contract-sheet">
      <p class="agreement-no">协议编号 {{ props.session.shareCode }}</p>
      <h2 class="contract-title">{{ generateContractTitle(props.session) }}</h2>
      <div class="party-row">
        <span>甲方：{{ initiator }}</span>
        <span>乙方：{{ counterparty }}</span>
      </div>
      <ul class="article-list">
        <li>{{ copy.contract.articles.spirit }}</li>
        <li>第一条：{{ props.session.challenge }}</li>
        <li>第二条：{{ props.session.judgmentRule }}</li>
        <li>第三条：败方应承担「{{ props.session.stake.label }} × {{ props.session.stake.quantity }}」一项。</li>
        <li>第四条：{{ copy.contract.articles.exception }}</li>
        <li>第五条：{{ copy.contract.articles.effective }}</li>
      </ul>
      <div class="seal">{{ copy.contract.seal }}</div>
    </article>

    <div class="bottom-actions">
      <BaseButton variant="secondary" size="lg" @click="emit('copyShare')">
        <Copy :size="18" />
        {{ copy.share.contractCta }}
      </BaseButton>
      <BaseButton size="lg" :disabled="!signed" @click="emit('start')">
        <Play :size="18" />
        {{ signed ? "进入本局" : "等待对方签约" }}
      </BaseButton>
    </div>
  </section>
</template>
