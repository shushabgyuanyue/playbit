<script setup lang="ts">
import { copy } from "@playbit/content";
import type { LoginInput, RegisterInput, User } from "@playbit/shared";
import { LogIn, LogOut, ShieldCheck } from "lucide-vue-next";
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
  logout: [];
}>();

const mode = ref<"register" | "login">("login");
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
      <section class="life-panel account-identity-panel">
        <BaseBadge :tone="user ? 'success' : 'contract'">
          {{ user ? copy.auth.accountReady : copy.auth.guest }}
        </BaseBadge>
        <h2 class="life-section-title">{{ user?.nickname ?? copy.auth.loginTitle }}</h2>
        <p class="life-section-caption">
          {{ user ? copy.auth.saveHint : copy.auth.requiredHint }}
        </p>
        <dl v-if="user" class="account-identity-list">
          <div>
            <dt>{{ copy.auth.accountEmail }}</dt>
            <dd>{{ user.email }}</dd>
          </div>
        </dl>
      </section>

      <div v-if="!user" class="life-status-tabs" :aria-label="copy.auth.account">
        <button type="button" :class="{ active: mode === 'register' }" @click="mode = 'register'">
          {{ copy.auth.registerTitle }}
        </button>
        <button type="button" :class="{ active: mode === 'login' }" @click="mode = 'login'">
          {{ copy.auth.loginTitle }}
        </button>
      </div>

      <section v-if="!user" class="life-panel">
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
        v-if="!user && mode === 'register'"
        size="lg"
        :disabled="loading || !form.email.trim() || form.password.length < 8 || !form.nickname.trim()"
        @click="emit('register', { email: form.email.trim(), password: form.password, nickname: form.nickname.trim() })"
      >
        <ShieldCheck :size="18" />
        {{ loading ? copy.common.loading : copy.auth.saveAccount }}
      </BaseButton>
      <BaseButton
        v-else-if="!user"
        size="lg"
        :disabled="loading || !form.email.trim() || !form.password"
        @click="emit('login', { email: form.email.trim(), password: form.password })"
      >
        <LogIn :size="18" />
        {{ loading ? copy.common.loading : copy.auth.login }}
      </BaseButton>
      <BaseButton v-else variant="outline" size="lg" @click="emit('logout')">
        <LogOut :size="18" />
        {{ copy.auth.logout }}
      </BaseButton>
    </LifeActionBar>
  </section>
</template>
