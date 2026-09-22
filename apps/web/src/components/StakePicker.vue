<script setup lang="ts">
import { copy } from "@playbit/content";
import type { Stake } from "@playbit/shared";
import { computed, ref, watch } from "vue";
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
  fulfilled: false
}));

watch(stake, (value) => emit("change", value), { immediate: true });
</script>

<template>
  <section class="stake-picker">
    <div class="stake-picker-heading">
      <h3 class="life-section-title">{{ copy.stakes.title }}</h3>
      <span class="life-section-caption">{{ copy.stakes.assetHint }}</span>
    </div>

    <div class="stake-option-grid">
      <button
        v-for="preset in presets"
        :key="preset.label"
        type="button"
        class="stake-option"
        :class="{ active: selectedLabel === preset.label }"
        @click="selectedLabel = preset.label"
      >
        <span class="stake-option-main">{{ preset.label }}</span>
        <span class="stake-option-copy">
          <strong>{{ preset.label }}</strong>
          <span>{{ preset.description }}</span>
        </span>
      </button>
    </div>

    <BaseField
      v-if="selectedPreset.type === 'custom'"
      v-model="customLabel"
      :label="copy.stakes.customLabel"
      :placeholder="copy.stakes.customPlaceholder"
    />
  </section>
</template>
