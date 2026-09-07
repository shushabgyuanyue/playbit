<script setup lang="ts">
import { cn } from "@/lib/utils";

defineProps<{
  label: string;
  modelValue: string;
  placeholder?: string;
  multiline?: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();
</script>

<template>
  <label class="grid gap-2">
    <span class="text-sm font-medium text-muted-foreground">{{ label }}</span>
    <textarea
      v-if="multiline"
      :value="modelValue"
      :placeholder="placeholder"
      :class="
        cn(
          'min-h-24 w-full resize-none rounded-md border border-input bg-white px-3 py-3 text-base leading-6 outline-none transition placeholder:text-muted-foreground/70 focus:border-ring focus:ring-2 focus:ring-ring/20'
        )
      "
      @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    />
    <input
      v-else
      :value="modelValue"
      :placeholder="placeholder"
      class="min-h-11 w-full rounded-md border border-input bg-white px-3 text-base outline-none transition placeholder:text-muted-foreground/70 focus:border-ring focus:ring-2 focus:ring-ring/20"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
  </label>
</template>

