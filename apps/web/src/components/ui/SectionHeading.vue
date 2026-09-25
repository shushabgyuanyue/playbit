<script setup lang="ts">
import { ChevronRight } from "lucide-vue-next";

defineProps<{ title: string; titleId?: string; actionLabel?: string; showArrow?: boolean }>();
const emit = defineEmits<{ action: [] }>();
</script>

<template>
  <div class="pb-section-heading">
    <h2 :id="titleId" class="pb-section-title">{{ title }}</h2>
    <button v-if="actionLabel" type="button" class="pb-section-action" @click="emit('action')">
      {{ actionLabel }}<ChevronRight v-if="showArrow" :size="15" aria-hidden="true" />
    </button>
  </div>
</template>
