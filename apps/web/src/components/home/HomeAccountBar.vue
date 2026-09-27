<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { copy } from "@playbit/content";
import UserAvatar from "../ui/UserAvatar.vue";

defineProps<{ nickname?: string; authenticated: boolean; avatarDataUrl?: string | null }>();
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
    <span class="home-account-brand" :aria-hidden="!scrolled">
      {{ copy.app.name }}
      <span
        class="home-auth-status-dot"
        :class="{ active: authenticated }"
        :title="authenticated ? copy.auth.statusSignedIn : copy.auth.statusGuest"
      />
    </span>
    <button type="button" class="home-account-action" :aria-label="copy.home.accountAction" @click="emit('account')">
      <span class="home-account-avatar">
        <UserAvatar :src="avatarDataUrl" :guest="!authenticated" />
      </span>
      <span class="home-account-label">{{ nickname ?? copy.home.accountGuestLabel }}</span>
    </button>
  </header>
</template>
