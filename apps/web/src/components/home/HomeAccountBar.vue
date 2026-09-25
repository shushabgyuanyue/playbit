<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { copy } from "@playbit/content";
import BrandMascot from "../ui/BrandMascot.vue";

defineProps<{ nickname?: string }>();
const emit = defineEmits<{ account: [] }>();
const scrolled = ref(false);
const updateScroll = () => { scrolled.value = window.scrollY > 24; };

onMounted(() => {
  updateScroll();
  window.addEventListener("scroll", updateScroll, { passive: true });
});
onUnmounted(() => window.removeEventListener("scroll", updateScroll));
</script>

<template>
  <header class="home-account-bar" :class="{ 'is-scrolled': scrolled }">
    <span class="home-account-brand" :aria-hidden="!scrolled">{{ copy.app.name }}</span>
    <button type="button" class="home-account-action" :aria-label="copy.home.accountAction" @click="emit('account')">
      <span class="home-account-avatar">
        <BrandMascot variant="rabbit-logo" width="36" height="40" />
      </span>
      <span class="home-account-label">{{ nickname ?? copy.home.accountGuestLabel }}</span>
    </button>
  </header>
</template>
