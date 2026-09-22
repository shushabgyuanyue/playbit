<script setup lang="ts">
defineProps<{
  label: string;
  modelValue: string;
  placeholder?: string;
  multiline?: boolean;
  type?: "text" | "email" | "password";
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();
</script>

<template>
  <label class="life-field">
    <span class="life-field-label">{{ label }}</span>
    <textarea
      v-if="multiline"
      :value="modelValue"
      :placeholder="placeholder"
      class="life-input life-textarea"
      @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    />
    <input
      v-else
      :type="type ?? 'text'"
      :value="modelValue"
      :placeholder="placeholder"
      class="life-input"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
  </label>
</template>
