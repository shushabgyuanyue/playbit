<script setup lang="ts">
import { copy } from "@playbit/content";
import { generateContractTitle } from "@playbit/game-core";
import type { BetSession } from "@playbit/shared";
import { FileSignature } from "lucide-vue-next";
import { ref } from "vue";
import BaseButton from "./ui/BaseButton.vue";
import BaseField from "./ui/BaseField.vue";

const props = defineProps<{
  session: BetSession | null;
  loading: boolean;
}>();

const emit = defineEmits<{
  sign: [nickname: string];
}>();

const nickname = ref("");
</script>

<template>
  <section class="screen">
    <div class="topbar">
      <div class="brand-mark">签</div>
      <span class="muted">{{ copy.sign.title }}</span>
    </div>

    <article v-if="props.session" class="contract-sheet compact">
      <p class="agreement-no">协议编号 {{ props.session.shareCode }}</p>
      <h2 class="contract-title">{{ generateContractTitle(props.session) }}</h2>
      <ul class="article-list">
        <li>约定事项：{{ props.session.challenge }}</li>
        <li>胜负判定：{{ props.session.judgmentRule }}</li>
        <li>履约凭证：{{ props.session.stake.label }} × {{ props.session.stake.quantity }}</li>
      </ul>
    </article>

    <div v-else class="challenge-card">
      <span class="card-label">未找到</span>
      <h2 class="card-name">这份签约链接暂时不可用</h2>
      <p class="card-content">可能是链接错误，或后端服务尚未连接数据库。</p>
    </div>

    <div v-if="props.session" class="field-group">
      <BaseField
        v-model="nickname"
        :label="copy.sign.nameLabel"
        :placeholder="copy.sign.namePlaceholder"
      />
    </div>

    <div v-if="props.session" class="bottom-actions">
      <BaseButton size="lg" :disabled="!nickname.trim() || props.loading" @click="emit('sign', nickname.trim())">
        <FileSignature :size="18" />
        {{ copy.sign.action }}
      </BaseButton>
    </div>
  </section>
</template>

