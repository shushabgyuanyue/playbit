<script setup lang="ts">
import { copy } from "@playbit/content";
import type { LoginInput, RegisterInput, User } from "@playbit/shared";
import { LogIn, ShieldCheck } from "lucide-vue-next";
import { reactive, ref } from "vue";
import BaseBadge from "./ui/BaseBadge.vue";
import BaseButton from "./ui/BaseButton.vue";
import BaseField from "./ui/BaseField.vue";
import LifeActionBar from "./ui/LifeActionBar.vue";
import LifeServiceHero from "./ui/LifeServiceHero.vue";

defineProps<{
  user: User | null;
  loading: boolean;
}>();

const emit = defineEmits<{
  back: [];
  register: [payload: RegisterInput];
  login: [payload: LoginInput];
}>();

const mode = ref<"register" | "login">("register");
const form = reactive({
  nickname: copy.common.me,
  email: "",
  password: ""
});
</script>

<template>
  <section class="life-page service-flow-page">
    <LifeServiceHero
      class="service-flow-hero"
      :eyebrow="copy.home.heroSubtitle"
      :title="copy.auth.account"
      :show-back="true"
      :back-label="copy.common.back"
      @back="emit('back')"
    />

    <div class="life-page-content service-flow-content">
      <section class="life-panel">
        <BaseBadge :tone="user?.authLevel === 'registered' ? 'success' : 'contract'">
          {{ user?.authLevel === "registered" ? copy.auth.registered : copy.auth.guest }}
        </BaseBadge>
        <h2 class="life-section-title">{{ user?.nickname ?? copy.auth.requiredTitle }}</h2>
        <p class="life-section-caption">{{ copy.auth.saveHint }}</p>
      </section>

      <div class="life-status-tabs" :aria-label="copy.auth.account">
        <button type="button" :class="{ active: mode === 'register' }" @click="mode = 'register'">
          {{ copy.auth.saveAccount }}
        </button>
        <button type="button" :class="{ active: mode === 'login' }" @click="mode = 'login'">
          {{ copy.auth.login }}
        </button>
      </div>

      <section class="life-panel">
        <div class="life-field-group">
          <BaseField v-if="mode === 'register'" v-model="form.nickname" :label="copy.auth.nickname" />
          <BaseField
            v-model="form.email"
            type="email"
            :label="copy.auth.email"
            :placeholder="copy.auth.emailPlaceholder"
          />
          <BaseField
            v-model="form.password"
            type="password"
            :label="copy.auth.password"
            :placeholder="copy.auth.passwordPlaceholder"
          />
        </div>
      </section>
    </div>

    <LifeActionBar>
      <BaseButton
        v-if="mode === 'register'"
        size="lg"
        :disabled="loading || !form.email.trim() || form.password.length < 8 || !form.nickname.trim()"
        @click="emit('register', { email: form.email.trim(), password: form.password, nickname: form.nickname.trim() })"
      >
        <ShieldCheck :size="18" />
        {{ loading ? copy.common.loading : copy.auth.saveAccount }}
      </BaseButton>
      <BaseButton
        v-else
        size="lg"
        :disabled="loading || !form.email.trim() || !form.password"
        @click="emit('login', { email: form.email.trim(), password: form.password })"
      >
        <LogIn :size="18" />
        {{ loading ? copy.common.loading : copy.auth.login }}
      </BaseButton>
    </LifeActionBar>
  </section>
</template>
