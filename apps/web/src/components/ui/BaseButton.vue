<script setup lang="ts">
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { computed } from "vue";

const buttonVariants = cva(
  "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition active:scale-[0.99] disabled:pointer-events-none disabled:opacity-45",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground shadow-sm",
        secondary: "bg-secondary text-secondary-foreground shadow-sm",
        outline: "border border-border bg-transparent text-foreground",
        ghost: "bg-transparent text-muted-foreground"
      },
      size: {
        md: "min-h-11",
        lg: "min-h-13 text-base"
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
  <button :class="classes" :disabled="disabled">
    <slot />
  </button>
</template>

