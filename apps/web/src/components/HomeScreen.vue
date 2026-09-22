<script setup lang="ts">
import { copy } from "@playbit/content";
import type { User } from "@playbit/shared";
import { Dices, FilePenLine, FileSignature, History, Ticket } from "lucide-vue-next";
import BaseButton from "./ui/BaseButton.vue";
import LifeAppBar from "./ui/LifeAppBar.vue";

defineProps<{
  user: User | null;
}>();

const emit = defineEmits<{
  create: [];
  draw: [];
  history: [];
  account: [];
  vouchers: [];
}>();
</script>

<template>
  <section class="life-page home-page">
    <LifeAppBar :title="copy.app.name">
      <template #action>
        <button type="button" class="home-account-button" @click="emit('account')">
          {{ user?.authLevel === "registered" ? copy.auth.registered : copy.auth.guest }}
        </button>
      </template>
    </LifeAppBar>

    <div class="life-page-content">
      <section class="home-hero">
        <div class="home-hero-mark">
          <FileSignature :size="16" />
          {{ copy.home.docketLabel }}
        </div>
        <h1 class="home-hero-title">{{ copy.app.tagline }}</h1>
        <p class="home-hero-copy">{{ copy.home.docketTitle }}</p>
      </section>

      <div class="home-action-stack">
        <BaseButton size="lg" @click="emit('create')">
          <FilePenLine :size="18" />
          {{ copy.home.primaryAction }}
        </BaseButton>
        <BaseButton variant="secondary" size="lg" @click="emit('draw')">
          <Dices :size="18" />
          {{ copy.home.secondaryAction }}
        </BaseButton>
      </div>

      <p class="life-section-caption">{{ copy.home.liveHint }}</p>

      <div class="home-secondary-row">
        <BaseButton variant="outline" @click="emit('history')">
          <History :size="17" />
          {{ copy.home.historyAction }}
        </BaseButton>
        <BaseButton variant="outline" @click="emit('vouchers')">
          <Ticket :size="17" />
          {{ copy.home.couponsAction }}
        </BaseButton>
      </div>
    </div>
  </section>
</template>
