<script setup lang="ts">
import { copy } from "@playbit/content";
import type { Stake } from "@playbit/shared";
import { Check, ChevronRight } from "lucide-vue-next";
import { computed, ref, watch } from "vue";
import BaseField from "./ui/BaseField.vue";
import VoucherTicket from "./ui/VoucherTicket.vue";
import { formatVoucherBenefit, inferStakeVoucherKind } from "../utils/voucherDisplay";

type StakePreset = {
  type: Stake["type"];
  label: string;
  description: string;
};

const emit = defineEmits<{
  change: [stake: Stake];
}>();

const props = defineProps<{
  modelValue?: Stake;
  title?: string;
  compact?: boolean;
  error?: string;
}>();

const presets = [
  ...(copy.stakes.presets as readonly StakePreset[]).filter((preset) => preset.type === "custom"),
  ...(copy.stakes.presets as readonly StakePreset[]).filter((preset) => preset.type !== "custom")
];
const customPreset = presets.find((preset) => preset.type === "custom") ?? presets[presets.length - 1];
const initialPreset = props.modelValue
  ? presets.find((item) => item.label === props.modelValue?.label && item.type === props.modelValue.type)
  : null;
const selectedLabel = ref(initialPreset?.label ?? (props.modelValue ? customPreset.label : presets[0].label));
const customLabel = ref(initialPreset ? "" : props.modelValue?.label ?? "");
const pickerOpen = ref(false);

const selectedPreset = computed(
  () => presets.find((preset) => preset.label === selectedLabel.value) ?? presets[0]
);

const stake = computed<Stake>(() => ({
  type: selectedPreset.value.type,
  label:
    selectedPreset.value.type === "custom" && customLabel.value.trim()
      ? customLabel.value.trim()
      : selectedPreset.value.label,
  fulfilled: false,
  additions: []
}));

const benefit = computed(() => formatVoucherBenefit(stake.value.label));
const selectedKind = computed(() => inferStakeVoucherKind(stake.value));

watch(stake, (value) => emit("change", value), { immediate: true });

watch(
  () => props.modelValue,
  (value) => {
    if (!value) {
      return;
    }
    const preset = presets.find((item) => item.label === value.label && item.type === value.type);
    selectedLabel.value = preset?.label ?? customPreset.label;
    customLabel.value = preset ? "" : value.label;
  },
  { deep: true }
);

function choose(preset: StakePreset) {
  selectedLabel.value = preset.label;
  pickerOpen.value = false;
}

function kindForPreset(preset: StakePreset) {
  return inferStakeVoucherKind({ type: preset.type, label: preset.label, fulfilled: false, additions: [] });
}
</script>

<template>
  <section class="stake-picker" :class="{ compact: props.compact }">
    <div class="stake-picker-heading">
      <h3 class="life-section-title">{{ props.title ?? copy.stakes.selected }}</h3>
    </div>

    <VoucherTicket
      class="stake-selected-row"
      :kind="selectedKind"
      status="available"
      size="mini"
      interactive
      :aria-label="copy.stakes.choose"
      @click="pickerOpen = true"
    >
      <template #value>
        <strong>{{ benefit.title }}</strong>
        <span>{{ benefit.subtitle }}</span>
      </template>
      <div class="stake-selected-copy">
        <strong>{{ stake.label }}</strong>
        <small>{{ selectedPreset.description }}</small>
      </div>
      <ChevronRight :size="17" aria-hidden="true" />
    </VoucherTicket>

    <BaseField
      v-if="selectedPreset.type === 'custom'"
      v-model="customLabel"
      :label="copy.stakes.customLabel"
      :placeholder="copy.stakes.customPlaceholder"
      :error="props.error"
    />

    <van-popup
      v-model:show="pickerOpen"
      round
      position="bottom"
      teleport="body"
      class="life-sheet-popup stake-picker-popup"
      :z-index="4001"
      overlay-class="stake-picker-overlay"
    >
      <section class="stake-picker-sheet">
        <div class="stake-sheet-handle" aria-hidden="true" />
        <header>
          <strong>{{ copy.stakes.choose }}</strong>
          <span>{{ copy.stakes.assetHint }}</span>
        </header>
        <div class="stake-options" role="radiogroup" :aria-label="copy.stakes.choose">
          <VoucherTicket
            v-for="preset in presets"
            :key="preset.label"
            class="stake-option"
            :kind="kindForPreset(preset)"
            status="available"
            size="mini"
            interactive
            :class="{ active: selectedLabel === preset.label }"
            role="radio"
            :aria-checked="selectedLabel === preset.label"
            @click="choose(preset)"
          >
            <template #value>
              <strong>{{ formatVoucherBenefit(preset.label).title }}</strong>
              <span>{{ formatVoucherBenefit(preset.label).subtitle }}</span>
            </template>
            <div class="stake-option-copy">
              <strong>{{ preset.label }}</strong>
              <small>{{ preset.description }}</small>
            </div>
            <span class="stake-radio" aria-hidden="true">
              <Check v-if="selectedLabel === preset.label" :size="12" :stroke-width="3" />
            </span>
          </VoucherTicket>
        </div>
      </section>
    </van-popup>
  </section>
</template>
