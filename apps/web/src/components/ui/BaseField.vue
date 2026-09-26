<script setup lang="ts">
import { ref } from "vue";

const props = defineProps<{
  label: string;
  modelValue: string;
  placeholder?: string;
  multiline?: boolean;
  type?: "text" | "email" | "password";
  name?: string;
  autocomplete?: string;
  inputmode?: "text" | "email" | "numeric";
  spellcheck?: boolean;
  autofocus?: boolean;
  error?: string;
}>();

const inputRef = ref<HTMLInputElement | HTMLTextAreaElement | null>(null);

function focus() {
  inputRef.value?.focus();
}

defineExpose({ focus });

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();
</script>

<template>
  <label class="life-field">
    <span class="life-field-label">{{ label }}</span>
    <textarea
      v-if="multiline"
      ref="inputRef"
      :value="modelValue"
      :placeholder="placeholder"
      class="life-input life-textarea"
      :name="props.name"
      :autocomplete="props.autocomplete"
      :spellcheck="props.spellcheck"
      :autofocus="props.autofocus"
      :aria-invalid="Boolean(props.error)"
      @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    />
    <input
      v-else
      ref="inputRef"
      :type="type ?? 'text'"
      :name="props.name"
      :value="modelValue"
      :placeholder="placeholder"
      class="life-input"
      :autocomplete="props.autocomplete"
      :inputmode="props.inputmode"
      :spellcheck="props.spellcheck"
      :autofocus="props.autofocus"
      :aria-invalid="Boolean(props.error)"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <span v-if="props.error" class="life-field-error" role="alert">{{ props.error }}</span>
  </label>
</template>
