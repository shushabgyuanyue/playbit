<script setup lang="ts">
import { copy } from "@playbit/content";
import { Bell, ChevronRight } from "lucide-vue-next";
import { computed } from "vue";
import LifeServiceHero from "./ui/LifeServiceHero.vue";

const props = defineProps<{
  activeIndex: number;
}>();

const emit = defineEmits<{
  back: [];
  select: [index: number];
}>();

const currentNotice = computed(() => copy.notices.items[props.activeIndex] ?? copy.notices.items[0]);
const otherNotices = computed(() => copy.notices.items
  .map((notice, index) => ({ ...notice, index }))
  .filter((notice) => notice.index !== props.activeIndex));
</script>

<template>
  <section class="life-page notices-page">
    <LifeServiceHero
      :title="copy.notices.title"
      :show-back="true"
      :back-label="copy.common.back"
      @back="emit('back')"
    />

    <div class="notices-content">
      <div class="notices-heading">
        <span class="notices-heading-icon"><Bell :size="19" aria-hidden="true" /></span>
        <span>{{ copy.notices.sectionTitle }}</span>
      </div>

      <article class="notices-detail">
        <span class="notices-item-index">{{ String(props.activeIndex + 1).padStart(2, "0") }}</span>
        <h2>{{ currentNotice.title }}</h2>
        <p>{{ currentNotice.body }}</p>
      </article>

      <p class="notices-footer">{{ copy.notices.footer }}</p>

      <nav class="notices-related" :aria-label="copy.notices.moreTitle">
        <h3>{{ copy.notices.moreTitle }}</h3>
        <button v-for="notice in otherNotices" :key="notice.title" type="button" @click="emit('select', notice.index)">
          <span>{{ notice.title }}</span>
          <ChevronRight :size="16" aria-hidden="true" />
        </button>
      </nav>
    </div>
  </section>
</template>
