<script setup lang="ts">
import { copy } from "@playbit/content";
import type { BetSession } from "@playbit/shared";
import { FileSignature } from "lucide-vue-next";
import ContractDocument from "./ContractDocument.vue";
import LifeActionBar from "./ui/LifeActionBar.vue";
import LifeAppBar from "./ui/LifeAppBar.vue";
import BaseButton from "./ui/BaseButton.vue";
import BaseField from "./ui/BaseField.vue";
import { ref } from "vue";

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
  <section class="life-page">
    <LifeAppBar :title="copy.sign.title" />

    <div v-if="props.session" class="life-page-content">
      <ContractDocument :session="props.session" :compact="true" :show-seal="false" />
      <section class="life-panel">
        <h2 class="life-section-title">{{ copy.sign.title }}</h2>
        <ul class="life-info-list">
          <li>
            <span>{{ copy.sign.summary.challenge }}</span>
            <strong>{{ props.session.challenge }}</strong>
          </li>
          <li>
            <span>{{ copy.sign.summary.judgment }}</span>
            <strong>{{ props.session.judgmentRule }}</strong>
          </li>
          <li>
            <span>{{ copy.sign.summary.stake }}</span>
            <strong>{{ props.session.stake.label }}</strong>
          </li>
        </ul>
      </section>
      <BaseField v-model="nickname" :label="copy.sign.nameLabel" :placeholder="copy.sign.namePlaceholder" />
    </div>

    <div v-else class="life-page-content">
      <section class="life-panel">
        <BaseButton variant="outline" disabled>{{ copy.sign.missingLabel }}</BaseButton>
        <h2 class="life-section-title">{{ copy.sign.missingTitle }}</h2>
        <p class="life-section-caption">{{ copy.sign.missingContent }}</p>
      </section>
    </div>

    <LifeActionBar v-if="props.session">
      <BaseButton size="lg" :disabled="!nickname.trim() || props.loading" @click="emit('sign', nickname.trim())">
        <FileSignature :size="18" />
        {{ props.loading ? copy.common.loading : copy.sign.action }}
      </BaseButton>
    </LifeActionBar>
  </section>
</template>
