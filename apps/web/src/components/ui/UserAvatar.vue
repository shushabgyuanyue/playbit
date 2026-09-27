<script setup lang="ts">
import { computed, ref, watch } from "vue";
import defaultAvatar from "../../assets/avatar-rabbit.webp";
import loginPanda from "../../assets/avatar-panda.webp";

const props = defineProps<{ src?: string | null; guest?: boolean }>();
const failed = ref(false);
watch(() => props.src, () => { failed.value = false; });
const uploaded = computed(() => !props.guest && Boolean(props.src) && !failed.value);
const source = computed(() => props.guest ? loginPanda : uploaded.value ? props.src! : defaultAvatar);
</script>

<template>
  <span class="user-avatar" :class="{ 'user-avatar-mascot': !uploaded }">
    <img :src="source" alt="" draggable="false" @error="failed = true" />
  </span>
</template>

<style scoped>
.user-avatar {
  display: block;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 50%;
}
.user-avatar img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}
.user-avatar-mascot img {
  object-position: 50% 34%;
  transform: scale(1.45);
}
</style>
