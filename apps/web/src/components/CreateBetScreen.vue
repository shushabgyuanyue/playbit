<script setup lang="ts">
import { copy } from "@playbit/content";
import type { CreateSessionInput, Stake } from "@playbit/shared";
import { FileCheck2 } from "lucide-vue-next";
import { reactive } from "vue";
import StakePicker from "./StakePicker.vue";
import LifeActionBar from "./ui/LifeActionBar.vue";
import LifeAppBar from "./ui/LifeAppBar.vue";
import BaseButton from "./ui/BaseButton.vue";
import BaseField from "./ui/BaseField.vue";

const emit = defineEmits<{
  back: [];
  submit: [payload: CreateSessionInput];
}>();

const form = reactive({
  title: "",
  judgmentRule: "",
  stake: {
    type: "coupon",
    label: "洗碗一次",
    fulfilled: false
  } as Stake
});

function submit() {
  emit("submit", {
    source: "custom",
    creatorNickname: "发起方",
    title: form.title,
    challenge: form.title,
    judgmentRule: form.judgmentRule,
    stake: form.stake,
    cardId: null
  });
}
</script>

<template>
  <section class="life-page">
    <LifeAppBar :title="copy.create.navTitle" :show-back="true" :back-label="copy.common.back" @back="emit('back')" />

    <div class="life-page-content">
      <section class="life-panel">
        <h2 class="life-section-title">{{ copy.create.title }}</h2>
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

      <StakePicker @change="form.stake = $event" />
    </div>

    <LifeActionBar>
      <BaseButton
        size="lg"
        :disabled="!form.title.trim() || !form.judgmentRule.trim()"
        @click="submit"
      >
        <FileCheck2 :size="18" />
        {{ copy.create.generate }}
      </BaseButton>
    </LifeActionBar>
  </section>
</template>
