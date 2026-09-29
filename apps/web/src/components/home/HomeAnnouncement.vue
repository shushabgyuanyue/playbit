<script setup lang="ts">
import { copy } from "@playbit/content";
import { ChevronRight, Megaphone } from "lucide-vue-next";
import { onMounted, onUnmounted, ref } from "vue";

const emit = defineEmits<{ open: [index: number] }>();
const activeIndex = ref(0);
const hovered = ref(false);
const focused = ref(false);
let timer: ReturnType<typeof setTimeout> | undefined;
let motionQuery: MediaQueryList | undefined;

function schedule() {
  if (timer) clearTimeout(timer);
  timer = undefined;
  if (document.hidden || hovered.value || focused.value || motionQuery?.matches) return;

  timer = setTimeout(() => {
    activeIndex.value = (activeIndex.value + 1) % copy.home.announcements.length;
    schedule();
  }, 6500);
}

onMounted(() => {
  motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  motionQuery.addEventListener("change", schedule);
  document.addEventListener("visibilitychange", schedule);
  schedule();
});
onUnmounted(() => {
  if (timer) clearTimeout(timer);
  motionQuery?.removeEventListener("change", schedule);
  document.removeEventListener("visibilitychange", schedule);
});
</script>

<template>
  <section class="home-announcement-section">
    <button
      type="button"
      class="home-announcement-bar"
      @click="emit('open', activeIndex)"
      @mouseenter="hovered = true; schedule()"
      @mouseleave="hovered = false; schedule()"
      @focus="focused = true; schedule()"
      @blur="focused = false; schedule()"
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
