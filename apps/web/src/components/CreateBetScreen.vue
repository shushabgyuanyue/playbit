<script setup lang="ts">
import { copy } from "@playbit/content";
import type { CreateSessionInput, Stake } from "@playbit/shared";
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
}>();

const emit = defineEmits<{
  back: [];
  submit: [payload: CreateSessionInput];
  updateDraft: [draft: CreateBetDraft];
}>();

const form = reactive({
  title: props.draft.title,
  judgmentRule: props.draft.judgmentRule,
  stake: props.draft.stake as Stake,
  creatorSignatureDataUrl: props.draft.creatorSignatureDataUrl
});

watch(
  form,
  () => {
    emit("updateDraft", {
      title: form.title,
      judgmentRule: form.judgmentRule,
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
    judgmentRule: form.judgmentRule,
    stake: form.stake,
    cardId: null
  });
}
</script>

<template>
  <section class="life-page service-flow-page">
    <LifeServiceHero
      class="service-flow-hero"
      :eyebrow="copy.home.docketLabel"
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
          <BaseField
            v-model="form.judgmentRule"
            :label="copy.create.judgment"
            multiline
            :placeholder="copy.create.judgmentPlaceholder"
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
        :disabled="!form.title.trim() || !form.judgmentRule.trim() || !form.creatorSignatureDataUrl"
        @click="submit"
      >
        <FileCheck2 :size="18" />
        {{ copy.create.generate }}
      </BaseButton>
    </LifeActionBar>
  </section>
</template>
