<script setup lang="ts">
import { copy } from "@playbit/content";
import { Info } from "lucide-vue-next";
import { ref } from "vue";

const noticeOpen = ref(false);
</script>

<template>
  <div class="agreement-notice-entry">
    <button
      type="button"
      class="agreement-notice-trigger"
      :aria-label="copy.create.noticeTitle"
      :aria-expanded="noticeOpen"
      @click="noticeOpen = true"
    >
      <Info :size="15" aria-hidden="true" />
      <span>{{ copy.create.noticeTitle }}</span>
    </button>

    <van-popup
      v-model:show="noticeOpen"
      round
      position="bottom"
      teleport="body"
      class="life-sheet-popup agreement-notice-popup"
      :z-index="3000"
    >
      <article class="agreement-notice-sheet">
        <div class="agreement-notice-handle" aria-hidden="true" />
        <header class="agreement-notice-heading">
          <h2>{{ copy.create.noticeDocumentTitle }}</h2>
          <h3>{{ copy.create.noticeDocumentSubtitle }}</h3>
        </header>
        <p class="agreement-notice-greeting">{{ copy.create.noticeGreeting }}</p>
        <p v-for="paragraph in copy.create.noticeParagraphs" :key="paragraph">{{ paragraph }}</p>
        <p class="agreement-notice-emphasis">{{ copy.create.noticeEmphasis }}</p>
        <section class="agreement-notice-confirmation">
          <h3>{{ copy.create.noticeConfirmTitle }}</h3>
          <p>{{ copy.create.noticeConfirmBody }}</p>
        </section>
      </article>
    </van-popup>
  </div>
</template>
