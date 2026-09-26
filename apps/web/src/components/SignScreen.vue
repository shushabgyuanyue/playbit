<script setup lang="ts">
import { copy } from "@playbit/content";
import type { Agreement, User } from "@playbit/shared";
import { FileSignature } from "lucide-vue-next";
import ContractDocument from "./ContractDocument.vue";
import AgreementNotice from "./ui/AgreementNotice.vue";
import LifeActionBar from "./ui/LifeActionBar.vue";
import LifeServiceHero from "./ui/LifeServiceHero.vue";
import BaseButton from "./ui/BaseButton.vue";
import BaseBadge from "./ui/BaseBadge.vue";
import SignaturePad from "./ui/SignaturePad.vue";
import { ref, watch } from "vue";

const props = defineProps<{
  agreement: Agreement | null;
  loading: boolean;
  user: User | null;
}>();

const emit = defineEmits<{
  decline: [];
  home: [];
  sign: [payload: { signatureDataUrl: string }];
}>();

const signatureDataUrl = ref(props.user?.signatureDataUrl ?? "");

watch(
  () => props.user,
  (user) => {
    if (!user) {
      return;
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
      :title="copy.sign.title"
      :show-home="true"
      :home-label="copy.common.home"
      @home="emit('home')"
    />

    <div v-if="props.agreement" class="life-page-content service-flow-content">
      <ContractDocument :agreement="props.agreement" :compact="true" :show-seal="false" />
      <section v-if="props.user" class="life-panel">
        <h2 class="life-section-title">{{ copy.sign.formTitle }}</h2>
        <ul class="life-info-list">
          <li>
            <span>{{ copy.sign.signer }}</span>
            <strong>{{ props.user.nickname }}</strong>
          </li>
        </ul>
      </section>
      <SignaturePad
        :label="copy.sign.signature"
        :model-value="signatureDataUrl"
        @change="signatureDataUrl = $event"
      />
      <div class="sign-signature-guidance">
        <p class="sign-signature-safety">{{ copy.signature.safety }}</p>
        <AgreementNotice />
      </div>
    </div>

    <div v-else class="life-page-content service-flow-content">
      <section class="life-panel">
        <BaseBadge tone="archive">{{ copy.sign.missingLabel }}</BaseBadge>
        <h2 class="life-section-title">{{ copy.sign.missingTitle }}</h2>
        <p class="life-section-caption">{{ copy.sign.missingContent }}</p>
      </section>
    </div>

    <LifeActionBar v-if="props.agreement">
      <BaseButton variant="outline" size="lg" :disabled="props.loading" @click="emit('decline')">
        {{ copy.sign.decline }}
      </BaseButton>
      <BaseButton
        size="lg"
        :loading="props.loading"
        :disabled="!signatureDataUrl"
        @click="emit('sign', { signatureDataUrl })"
      >
        <FileSignature :size="18" />
        {{ copy.sign.action }}
      </BaseButton>
    </LifeActionBar>
  </section>
</template>
