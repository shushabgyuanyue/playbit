<script setup lang="ts">
import { copy } from "@playbit/content";
import type { Stake } from "@playbit/shared";
import { ChevronRight } from "lucide-vue-next";
import { computed, ref, watch } from "vue";
import BaseField from "./ui/BaseField.vue";
import {
  formatVoucherBenefit,
  inferStakeVoucherKind
} from "../utils/voucherDisplay";

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
  <section class="stake-picker">
    <div class="stake-picker-heading">
      <h3 class="life-section-title">{{ props.title ?? copy.stakes.selected }}</h3>
      <button type="button" class="stake-change-button" @click="pickerOpen = true">
        {{ copy.common.change }}
        <ChevronRight :size="14" />
      </button>
    </div>

    <button
      type="button"
      class="stake-ticket-button voucher-ticket"
      :class="[`kind-${selectedKind}`, 'status-available']"
      @click="pickerOpen = true"
    >
      <section class="voucher-ticket-value">
        <strong>{{ benefit.title }}</strong>
        <span>{{ benefit.subtitle }}</span>
      </section>
      <section class="voucher-ticket-main">
        <div class="voucher-ticket-copy">
          <div class="voucher-ticket-title-row">
            <strong>{{ stake.label }}</strong>
          </div>
          <p class="voucher-ticket-time">{{ selectedPreset.description }}</p>
        </div>
        <span class="stake-ticket-action">{{ copy.stakes.choose }}</span>
      </section>
    </button>

    <BaseField
      v-if="selectedPreset.type === 'custom'"
      v-model="customLabel"
      :label="copy.stakes.customLabel"
      :placeholder="copy.stakes.customPlaceholder"
    />

    <van-popup v-model:show="pickerOpen" round position="bottom" class="stake-picker-popup">
      <section class="stake-picker-sheet">
        <header>
          <strong>{{ copy.stakes.choose }}</strong>
        </header>
        <button
          v-for="preset in presets"
          :key="preset.label"
          type="button"
          class="stake-sheet-option voucher-ticket status-available"
          :class="[`kind-${kindForPreset(preset)}`, { active: selectedLabel === preset.label }]"
          @click="choose(preset)"
        >
          <section class="voucher-ticket-value">
            <strong>{{ formatVoucherBenefit(preset.label).title }}</strong>
            <span>{{ formatVoucherBenefit(preset.label).subtitle }}</span>
          </section>
          <section class="voucher-ticket-main">
            <div class="voucher-ticket-copy">
              <div class="voucher-ticket-title-row">
                <strong>{{ preset.label }}</strong>
              </div>
              <p class="voucher-ticket-time">{{ preset.description }}</p>
            </div>
            <span class="stake-sheet-check">{{ selectedLabel === preset.label ? copy.common.selected : copy.stakes.choose }}</span>
          </section>
        </button>
      </section>
    </van-popup>
  </section>
</template>
