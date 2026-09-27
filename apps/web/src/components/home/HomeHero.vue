<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { copy } from "@playbit/content";
import agreementPoster from "../../assets/home-agreement-poster.webp";
import gamePoster from "../../assets/home-game-poster.webp";

const emit = defineEmits<{ create: []; draw: [] }>();
const posters = [
  { image: agreementPoster, title: copy.app.name, action: copy.home.heroAction },
  { image: gamePoster, title: copy.home.heroGameTitle, action: copy.home.heroGameAction }
];
const root = ref<HTMLElement | null>(null);
const active = ref(0);
const ready = ref([false, false]);
const secondRequested = ref(false);
const transitioning = ref(false);
const reducedMotion = ref(false);
let hovered = false;
let focused = false;
let touching = false;
let visible = true;
let timer: ReturnType<typeof setTimeout> | undefined;
let preloadTimer: ReturnType<typeof setTimeout> | undefined;
let idleCallback: number | undefined;
let observer: IntersectionObserver | undefined;
let motionQuery: MediaQueryList | undefined;

function schedule() {
  clearTimeout(timer);
  if (reducedMotion.value || transitioning.value || hovered || focused || touching ||
      !visible || document.hidden || !ready.value.every(Boolean)) return;
  timer = setTimeout(() => select(1 - active.value), 15000);
}

function select(index: number) {
  if (index === active.value || transitioning.value || !ready.value[index]) return;
  clearTimeout(timer);
  transitioning.value = true;
  active.value = index;
}

function settled() {
  transitioning.value = false;
  schedule();
}

function loaded(index: number) {
  ready.value[index] = true;
  if (index === 0 && !secondRequested.value) {
    // Keep the second poster out of the initial image and script download window.
    preloadTimer = setTimeout(() => {
      if ("requestIdleCallback" in window) {
        idleCallback = window.requestIdleCallback(() => { secondRequested.value = true; }, { timeout: 1500 });
      } else {
        secondRequested.value = true;
      }
    }, 1200);
  }
  schedule();
}

function pointer(event: PointerEvent, inside: boolean) {
  if (event.pointerType === "mouse") hovered = inside;
  schedule();
}

function focusOut(event: FocusEvent) {
  focused = event.relatedTarget instanceof Node && Boolean(root.value?.contains(event.relatedTarget));
  schedule();
}

function focusIn() {
  focused = true;
  schedule();
}

function holdPointer() {
  touching = true;
  schedule();
}

function releasePointer() {
  if (!touching) return;
  touching = false;
  schedule();
}

function updateMotion() {
  reducedMotion.value = motionQuery?.matches ?? false;
  schedule();
}

function activate() {
  if (transitioning.value) return;
  if (active.value === 0) emit("create");
  else emit("draw");
}

onMounted(() => {
  motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  updateMotion();
  motionQuery.addEventListener("change", updateMotion);
  document.addEventListener("visibilitychange", schedule);
  window.addEventListener("pointerup", releasePointer);
  window.addEventListener("pointercancel", releasePointer);
  observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    schedule();
  }, { threshold: 0.25 });
  if (root.value) observer.observe(root.value);
});

onUnmounted(() => {
  clearTimeout(timer);
  clearTimeout(preloadTimer);
  if (idleCallback !== undefined) window.cancelIdleCallback(idleCallback);
  observer?.disconnect();
  motionQuery?.removeEventListener("change", updateMotion);
  document.removeEventListener("visibilitychange", schedule);
  window.removeEventListener("pointerup", releasePointer);
  window.removeEventListener("pointercancel", releasePointer);
});
</script>

<template>
  <header
    ref="root"
    class="home-hero"
    :aria-label="copy.home.heroLabel"
    @pointerenter="pointer($event, true)"
    @pointerleave="pointer($event, false)"
    @pointerdown="holdPointer"
    @focusin="focusIn"
    @focusout="focusOut"
  >
    <h1 class="home-visually-hidden">{{ copy.app.name }}</h1>
    <div class="home-hero-art" aria-live="off">
      <Transition v-for="(poster, index) in posters" :key="poster.image" name="home-poster" @after-enter="settled">
        <img
          v-show="active === index"
          class="home-hero-poster"
          :src="index === 0 || secondRequested ? poster.image : undefined"
          :alt="poster.title"
          :aria-hidden="active !== index"
          :fetchpriority="index === 0 ? 'high' : 'low'"
          decoding="async"
          draggable="false"
          @load="loaded(index)"
        />
      </Transition>
    </div>
    <button type="button" class="home-hero-cta" :disabled="transitioning" :aria-label="posters[active].action" @click="activate">
      <Transition name="home-hero-label" mode="out-in">
        <span :key="active" aria-hidden="true">{{ posters[active].action }}</span>
      </Transition>
    </button>
    <div class="home-hero-pagination" aria-hidden="true">
      <span
        v-for="(poster, index) in posters"
        :key="poster.image"
        :class="{ 'is-active': active === index }"
      />
    </div>
  </header>
</template>
