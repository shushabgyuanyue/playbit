<script setup lang="ts">
import { copy } from "@playbit/content";
import type { CreateAgreementInput, Stake, User } from "@playbit/shared";
import { FileCheck2 } from "lucide-vue-next";
import { reactive, watch } from "vue";
import type { CreateBetDraft } from "../composables/usePlaybitFlow";
import StakePicker from "./StakePicker.vue";
import LifeActionBar from "./ui/LifeActionBar.vue";
import LifeServiceHero from "./ui/LifeServiceHero.vue";
import BaseButton from "./ui/BaseButton.vue";
import BaseField from "./ui/BaseField.vue";
import SignaturePad from "./ui/SignaturePad.vue";

const props = defineProps<{
  draft: CreateBetDraft;
  user: User | null;
}>();

const emit = defineEmits<{
  back: [];
  submit: [payload: CreateAgreementInput];
  updateDraft: [draft: CreateBetDraft];
}>();

const form = reactive({
  title: props.draft.title,
  stake: props.draft.stake as Stake,
  creatorSignatureDataUrl: props.draft.creatorSignatureDataUrl || props.user?.signatureDataUrl || ""
});

watch(
  form,
  () => {
    emit("updateDraft", {
      title: form.title,
      stake: form.stake,
      creatorSignatureDataUrl: form.creatorSignatureDataUrl
    });
  },
  { deep: true }
);

function submit() {
  emit("submit", {
    source: "custom",
    creatorNickname: copy.common.initiator,
    creatorSignatureDataUrl: form.creatorSignatureDataUrl,
    title: form.title,
    challenge: form.title,
    stake: form.stake,
    cardId: null
  });
}
</script>

<template>
  <section class="life-page service-flow-page">
    <LifeServiceHero
      class="service-flow-hero"
      :title="copy.create.title"
      :show-back="true"
      :back-label="copy.common.back"
      @back="emit('back')"
    />

    <div class="life-page-content service-flow-content service-overlap-content">
      <section class="life-summary-card">
        <header>
          <strong>{{ copy.create.navTitle }}</strong>
        </header>
        <p class="life-section-caption">{{ copy.create.subtitle }}</p>
      </section>

      <section class="life-panel">
        <div class="life-field-group">
          <BaseField
            v-model="form.title"
            :label="copy.create.agreement"
            :placeholder="copy.create.agreementPlaceholder"
          />
        </div>
      </section>

      <StakePicker :model-value="form.stake" @change="form.stake = $event" />
      <SignaturePad
        :label="copy.create.signature"
        :model-value="form.creatorSignatureDataUrl"
        @change="form.creatorSignatureDataUrl = $event"
      />
    </div>

    <LifeActionBar>
      <BaseButton
        size="lg"
        :disabled="!form.title.trim() || !form.creatorSignatureDataUrl"
        @click="submit"
      >
        <FileCheck2 :size="18" />
        {{ copy.create.generate }}
      </BaseButton>
    </LifeActionBar>
  </section>
</template>
