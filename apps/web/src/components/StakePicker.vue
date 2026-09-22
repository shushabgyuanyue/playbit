<script setup lang="ts">
import { copy } from "@playbit/content";
import type { Stake } from "@playbit/shared";
import { ChevronRight } from "lucide-vue-next";
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

const props = defineProps<{
  modelValue?: Stake;
}>();

const presets = copy.stakes.presets as readonly StakePreset[];
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
  fulfilled: false
}));

const benefit = computed(() => splitBenefit(stake.value.label));
const selectedKind = computed(() => kindForStake(stake.value));

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

function splitBenefit(label: string) {
  if (label.includes("一杯")) {
    return { title: label.replace(/^请/, "").replace("一杯", "") || label, subtitle: copy.vouchers.benefitSubtitles.cup };
  }
  if (label.endsWith("一次")) {
    return { title: label.slice(0, -"一次".length), subtitle: copy.vouchers.benefitSubtitles.once };
  }
  if (label.endsWith("权一次")) {
    return { title: label.replace("权一次", "权"), subtitle: copy.vouchers.benefitSubtitles.decisionRight };
  }
  return { title: label, subtitle: copy.vouchers.ticketCaption };
}

function kindForStake(value: Stake) {
  if (value.type === "point") {
    return "decision";
  }
  if (value.type === "custom") {
    return "custom";
  }
  if (/洗|饭|家务|做饭|碗/.test(value.label)) {
    return "housework";
  }
  if (/奶茶|咖啡|请客|喝|吃/.test(value.label)) {
    return "treat";
  }
  if (/决定|安排|选择|同意|免/.test(value.label)) {
    return "decision";
  }
  return "service";
}

function kindForPreset(preset: StakePreset) {
  return kindForStake({ type: preset.type, label: preset.label, fulfilled: false });
}
</script>

<template>
  <section class="stake-picker">
    <div class="stake-picker-heading">
      <h3 class="life-section-title">{{ copy.stakes.selected }}</h3>
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
            <strong>{{ splitBenefit(preset.label).title }}</strong>
            <span>{{ splitBenefit(preset.label).subtitle }}</span>
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
