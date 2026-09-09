<script setup lang="ts">
import { copy } from "@playbit/content";
import type { User } from "@playbit/shared";
import { Dices, FilePenLine, History, Ticket } from "lucide-vue-next";
import BaseButton from "./ui/BaseButton.vue";

defineProps<{
  user: User | null;
}>();

const emit = defineEmits<{
  create: [];
  draw: [];
  history: [];
  account: [];
}>();
</script>

<template>
  <section class="screen">
    <div class="topbar">
      <div class="brand-mark">局</div>
      <button class="account-chip" @click="emit('account')">
        {{ user?.authLevel === "registered" ? copy.auth.registered : copy.auth.guest }}
      </button>
    </div>

    <h1 class="hero-title">{{ copy.app.tagline }}</h1>
    <p class="hero-copy">{{ copy.app.oneLiner }}</p>

    <div class="action-stack">
      <BaseButton size="lg" @click="emit('create')">
        <FilePenLine :size="19" />
        {{ copy.home.primaryAction }}
      </BaseButton>
      <BaseButton variant="secondary" size="lg" @click="emit('draw')">
        <Dices :size="19" />
        {{ copy.home.secondaryAction }}
      </BaseButton>
    </div>

    <p class="hero-copy">{{ copy.home.liveHint }}</p>

    <div class="quiet-row">
      <BaseButton variant="outline" @click="emit('history')">
        <History :size="17" />
        {{ copy.home.historyAction }}
      </BaseButton>
      <BaseButton variant="outline" @click="emit('account')">
        <Ticket :size="17" />
        {{ copy.home.couponsAction }}
      </BaseButton>
    </div>
  </section>
</template>
