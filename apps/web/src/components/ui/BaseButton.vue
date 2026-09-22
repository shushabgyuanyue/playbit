<script setup lang="ts">
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { computed } from "vue";

const buttonVariants = cva(
  "life-button",
  {
    variants: {
      variant: {
        primary: "life-button-primary",
        secondary: "life-button-secondary",
        outline: "life-button-outline",
        ghost: "life-button-ghost",
        danger: "life-button-danger"
      },
      size: {
        md: "life-button-md",
        lg: "life-button-lg",
        sm: "life-button-sm"
      }
    },
    defaultVariants: {
      variant: "primary",
      size: "md"
    }
  }
);

type ButtonVariants = VariantProps<typeof buttonVariants>;

const props = defineProps<{
  variant?: ButtonVariants["variant"];
  size?: ButtonVariants["size"];
  disabled?: boolean;
  class?: string;
}>();

const classes = computed(() => cn(buttonVariants({ variant: props.variant, size: props.size }), props.class));
</script>

<template>
  <button type="button" :class="classes" :disabled="disabled">
    <slot />
  </button>
</template>
