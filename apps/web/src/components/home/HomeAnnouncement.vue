<script setup lang="ts">
import { copy } from "@playbit/content";
import { ChevronRight, Megaphone } from "lucide-vue-next";
import { onMounted, onUnmounted, ref } from "vue";

const emit = defineEmits<{ open: [index: number] }>();
const activeIndex = ref(0);
const hovered = ref(false);
const focused = ref(false);
let timer: ReturnType<typeof setInterval> | undefined;

onMounted(() => {
  timer = setInterval(() => {
    if (document.hidden || hovered.value || focused.value) return;
    activeIndex.value = (activeIndex.value + 1) % copy.home.announcements.length;
  }, 6500);
});
onUnmounted(() => clearInterval(timer));
</script>

<template>
  <section class="home-announcement-section">
    <button
      type="button"
      class="home-announcement-bar"
      @click="emit('open', activeIndex)"
      @mouseenter="hovered = true"
      @mouseleave="hovered = false"
      @focus="focused = true"
      @blur="focused = false"
    >
      <span class="home-announcement-label"><Megaphone :size="16" aria-hidden="true" />{{ copy.home.announcementTitle }}</span>
      <span class="home-announcement-viewport" aria-live="off">
        <Transition name="home-announcement-slide">
          <span :key="activeIndex" class="home-announcement-current">{{ copy.home.announcements[activeIndex] }}</span>
        </Transition>
      </span>
      <ChevronRight :size="16" aria-hidden="true" />
    </button>
  </section>
</template>
