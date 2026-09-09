<script setup lang="ts">
import { copy } from "@playbit/content";
import type { LoginInput, RegisterInput, User } from "@playbit/shared";
import { ArrowLeft, LogIn, ShieldCheck } from "lucide-vue-next";
import { reactive, ref } from "vue";
import BaseButton from "./ui/BaseButton.vue";
import BaseField from "./ui/BaseField.vue";

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
  nickname: "我",
  email: "",
  password: ""
});
</script>

<template>
  <section class="screen">
    <div class="topbar">
      <BaseButton variant="outline" class="w-auto min-h-9 px-3" @click="emit('back')">
        <ArrowLeft :size="17" />
        返回
      </BaseButton>
      <span class="muted">{{ copy.auth.account }}</span>
    </div>

    <div class="challenge-card">
      <span class="card-label">{{ user?.authLevel === "registered" ? copy.auth.registered : copy.auth.guest }}</span>
      <h2 class="card-name">{{ user?.nickname ?? "临时用户" }}</h2>
      <p class="card-content">{{ copy.auth.saveHint }}</p>
    </div>

    <div class="segmented-control">
      <button :class="{ active: mode === 'register' }" @click="mode = 'register'">{{ copy.auth.saveAccount }}</button>
      <button :class="{ active: mode === 'login' }" @click="mode = 'login'">{{ copy.auth.login }}</button>
    </div>

    <div class="field-group">
      <BaseField v-if="mode === 'register'" v-model="form.nickname" :label="copy.auth.nickname" />
      <BaseField v-model="form.email" type="email" :label="copy.auth.email" placeholder="name@example.com" />
      <BaseField v-model="form.password" type="password" :label="copy.auth.password" placeholder="至少 8 位" />
    </div>

    <div class="bottom-actions">
      <BaseButton
        v-if="mode === 'register'"
        size="lg"
        :disabled="loading || !form.email.trim() || form.password.length < 8 || !form.nickname.trim()"
        @click="emit('register', { email: form.email.trim(), password: form.password, nickname: form.nickname.trim() })"
      >
        <ShieldCheck :size="18" />
        {{ copy.auth.saveAccount }}
      </BaseButton>
      <BaseButton
        v-else
        size="lg"
        :disabled="loading || !form.email.trim() || !form.password"
        @click="emit('login', { email: form.email.trim(), password: form.password })"
      >
        <LogIn :size="18" />
        {{ copy.auth.login }}
      </BaseButton>
    </div>
  </section>
</template>
