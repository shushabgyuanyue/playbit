<script setup lang="ts">
import { copy } from "@playbit/content";
import type { Stake } from "@playbit/shared";
import { computed, ref, watch } from "vue";
import BaseButton from "./ui/BaseButton.vue";
import BaseField from "./ui/BaseField.vue";

type StakePreset = {
  type: Stake["type"];
  label: string;
  description: string;
};

const emit = defineEmits<{
  change: [stake: Stake];
}>();

const presets = copy.stakes.presets as readonly StakePreset[];
const selectedLabel = ref(presets[0].label);
const quantity = ref(1);
const customLabel = ref("");

const selectedPreset = computed(
  () => presets.find((preset) => preset.label === selectedLabel.value) ?? presets[0]
);

const stake = computed<Stake>(() => ({
  type: selectedPreset.value.type,
  label:
    selectedPreset.value.type === "custom" && customLabel.value.trim()
      ? customLabel.value.trim()
      : selectedPreset.value.label,
  quantity: quantity.value,
  fulfilled: false
}));

function step(delta: number) {
  quantity.value = Math.max(1, Math.min(9, quantity.value + delta));
}

watch(stake, (value) => emit("change", value), { immediate: true });
</script>

<template>
  <section class="stake-picker">
    <div class="section-row">
      <h3 class="section-title">{{ copy.stakes.title }}</h3>
      <span class="muted">权益凭证</span>
    </div>

    <div class="voucher-grid">
      <button
        v-for="preset in presets"
        :key="preset.label"
        class="voucher-option"
        :class="{ active: selectedLabel === preset.label }"
        @click="selectedLabel = preset.label"
      >
        <span class="voucher-main">{{ preset.label }}</span>
        <span class="voucher-sub">{{ preset.description }}</span>
      </button>
    </div>

    <BaseField
      v-if="selectedPreset.type === 'custom'"
      v-model="customLabel"
      label="自定义内容"
      placeholder="例如：明天负责接孩子"
    />

    <div class="quantity-row">
      <span>{{ copy.stakes.quantity }}</span>
      <div class="quantity-control">
        <BaseButton variant="outline" class="h-9 min-h-9 w-9 px-0" @click="step(-1)">-</BaseButton>
        <strong>{{ quantity }}</strong>
        <BaseButton variant="outline" class="h-9 min-h-9 w-9 px-0" @click="step(1)">+</BaseButton>
      </div>
    </div>
  </section>
</template>

