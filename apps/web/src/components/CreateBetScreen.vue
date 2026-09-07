<script setup lang="ts">
import { copy } from "@playbit/content";
import type { CreateSessionInput } from "@playbit/shared";
import { ArrowLeft, FileCheck2 } from "lucide-vue-next";
import { reactive } from "vue";
import BaseButton from "./ui/BaseButton.vue";
import BaseField from "./ui/BaseField.vue";

const emit = defineEmits<{
  back: [];
  submit: [payload: CreateSessionInput];
}>();

const form = reactive({
  partyA: "我",
  partyB: "",
  title: "",
  challenge: "",
  judgmentRule: "",
  stakeLabel: "洗碗券",
  stakeType: "coupon" as const
});

function submit() {
  emit("submit", {
    source: "custom",
    partyA: form.partyA,
    partyB: form.partyB,
    title: form.title,
    challenge: form.challenge,
    judgmentRule: form.judgmentRule,
    stake: {
      type: form.stakeType,
      label: form.stakeLabel,
      quantity: 1,
      fulfilled: false
    },
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

    <h2 class="section-title">把这件小事立下来</h2>
    <div class="field-group">
      <BaseField v-model="form.partyA" label="我方" placeholder="例如：小王" />
      <BaseField v-model="form.partyB" label="对方" placeholder="例如：小李" />
      <BaseField v-model="form.title" label="赌局" placeholder="例如：谁会先迟到" />
      <BaseField
        v-model="form.challenge"
        label="约定"
        multiline
        placeholder="例如：明天下午三点前到达咖啡店"
      />
      <BaseField
        v-model="form.judgmentRule"
        label="判定"
        multiline
        placeholder="例如：最后到的人输"
      />
      <BaseField v-model="form.stakeLabel" label="赌注" placeholder="例如：洗碗券 ×1" />
    </div>

    <div class="bottom-actions">
      <BaseButton size="lg" @click="submit">
        <FileCheck2 :size="18" />
        生成正式赌约
      </BaseButton>
    </div>
  </section>
</template>
