<script setup lang="ts">
import { copy } from "@playbit/content";
import type { CreateSessionInput, Stake } from "@playbit/shared";
import { ArrowLeft, FileCheck2 } from "lucide-vue-next";
import { reactive } from "vue";
import StakePicker from "./StakePicker.vue";
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
    label: "洗碗券",
    quantity: 1,
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
  <section class="screen">
    <div class="topbar">
      <BaseButton variant="outline" class="w-auto min-h-9 px-3" @click="emit('back')">
        <ArrowLeft :size="17" />
        返回
      </BaseButton>
      <span class="muted">立约</span>
    </div>

    <h2 class="section-title">{{ copy.create.title }}</h2>
    <div class="field-group">
      <BaseField v-model="form.title" :label="copy.create.agreement" :placeholder="copy.create.agreementPlaceholder" />
      <BaseField
        v-model="form.judgmentRule"
        :label="copy.create.judgment"
        multiline
        :placeholder="copy.create.judgmentPlaceholder"
      />
    </div>
    <StakePicker @change="form.stake = $event" />

    <div class="bottom-actions">
      <BaseButton size="lg" :disabled="!form.title.trim() || !form.judgmentRule.trim()" @click="submit">
        <FileCheck2 :size="18" />
        {{ copy.create.generate }}
      </BaseButton>
    </div>
  </section>
</template>
