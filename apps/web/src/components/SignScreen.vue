<script setup lang="ts">
import { copy } from "@playbit/content";
import type { BetSession, User } from "@playbit/shared";
import { FileSignature } from "lucide-vue-next";
import ContractDocument from "./ContractDocument.vue";
import LifeActionBar from "./ui/LifeActionBar.vue";
import LifeServiceHero from "./ui/LifeServiceHero.vue";
import BaseButton from "./ui/BaseButton.vue";
import BaseField from "./ui/BaseField.vue";
import SignaturePad from "./ui/SignaturePad.vue";
import { ref, watch } from "vue";

const props = defineProps<{
  session: BetSession | null;
  loading: boolean;
  user: User | null;
}>();

const emit = defineEmits<{
  decline: [];
  sign: [payload: { nickname: string; signatureDataUrl: string }];
}>();

const nickname = ref(props.user?.nickname ?? "");
const signatureDataUrl = ref(props.user?.signatureDataUrl ?? "");

watch(
  () => props.user,
  (user) => {
    if (!user) {
      return;
    }
    if (!nickname.value.trim()) {
      nickname.value = user.nickname;
    }
    if (!signatureDataUrl.value && user.signatureDataUrl) {
      signatureDataUrl.value = user.signatureDataUrl;
    }
  },
  { immediate: true }
);
</script>

<template>
  <section class="life-page service-flow-page">
    <LifeServiceHero
      class="service-flow-hero"
      :eyebrow="copy.home.docketLabel"
      :title="copy.sign.title"
    />

    <div v-if="props.session" class="life-page-content service-flow-content">
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
      <SignaturePad
        :label="copy.contract.confirmB"
        :model-value="signatureDataUrl"
        @change="signatureDataUrl = $event"
      />
    </div>

    <div v-else class="life-page-content service-flow-content">
      <section class="life-panel">
        <BaseButton variant="outline" disabled>{{ copy.sign.missingLabel }}</BaseButton>
        <h2 class="life-section-title">{{ copy.sign.missingTitle }}</h2>
        <p class="life-section-caption">{{ copy.sign.missingContent }}</p>
      </section>
    </div>

    <LifeActionBar v-if="props.session">
      <BaseButton variant="outline" size="lg" :disabled="props.loading" @click="emit('decline')">
        {{ copy.sign.decline }}
      </BaseButton>
      <BaseButton
        size="lg"
        :loading="props.loading"
        :disabled="!nickname.trim() || !signatureDataUrl"
        @click="emit('sign', { nickname: nickname.trim(), signatureDataUrl })"
      >
        <FileSignature :size="18" />
        {{ copy.sign.action }}
      </BaseButton>
    </LifeActionBar>
  </section>
</template>
