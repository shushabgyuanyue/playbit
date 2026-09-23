<script setup lang="ts">
import { copy } from "@playbit/content";
import type { LoginInput, RegisterInput } from "@playbit/shared";
import { AlertCircle, Check, LockKeyhole, X } from "lucide-vue-next";
import { computed, reactive, watch } from "vue";
import BaseButton from "./ui/BaseButton.vue";
import BaseField from "./ui/BaseField.vue";

const props = defineProps<{
  show: boolean;
  loading: boolean;
  error?: string | null;
  step: "credentials" | "register";
}>();

const emit = defineEmits<{
  "update:show": [show: boolean];
  register: [payload: RegisterInput];
  login: [payload: LoginInput];
  "clear-error": [];
}>();

const form = reactive({
  nickname: "",
  email: "",
  password: ""
});

const isRegister = computed(() => props.step === "register");
const emailValid = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()));
const passwordValid = computed(() => form.password.length >= 8);
const canSubmit = computed(() =>
  Boolean(
    emailValid.value &&
      passwordValid.value &&
      (!isRegister.value || (form.nickname.trim() && form.password.length >= 8))
  )
);

watch(
  () => props.show,
  (show) => {
    if (show) {
      emit("clear-error");
    }
  }
);

function close() {
  if (!props.loading) {
    emit("update:show", false);
  }
}

function submit() {
  if (!canSubmit.value || props.loading) {
    return;
  }

  if (isRegister.value) {
    emit("register", {
      email: form.email.trim(),
      password: form.password,
      nickname: form.nickname.trim()
    });
    return;
  }

  emit("login", {
    email: form.email.trim(),
    password: form.password
  });
}
</script>

<template>
  <van-popup
    :show="props.show"
    position="bottom"
    round
    class="auth-sheet-popup"
    :close-on-click-overlay="!props.loading"
    @update:show="emit('update:show', $event)"
  >
    <section class="auth-sheet" aria-labelledby="auth-sheet-title">
      <div class="auth-sheet-handle" aria-hidden="true" />

      <header class="auth-sheet-header">
        <div>
          <p class="auth-sheet-kicker">{{ copy.app.name }}</p>
          <h2 id="auth-sheet-title">
            {{ isRegister ? copy.auth.completeRegisterTitle : copy.auth.loginTitle }}
          </h2>
        </div>
        <button
          type="button"
          class="auth-sheet-close"
          :aria-label="copy.auth.close"
          :disabled="props.loading"
          @click="close"
        >
          <X :size="19" />
        </button>
      </header>

      <p class="auth-sheet-hint">
        {{ isRegister ? copy.auth.registerHint : copy.auth.loginHint }}
      </p>

      <form class="auth-sheet-form" @submit.prevent="submit">
        <div class="life-field-group">
          <BaseField
            v-if="isRegister"
            v-model="form.nickname"
            :label="copy.auth.nickname"
            :placeholder="copy.auth.nicknamePlaceholder"
          />
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

        <p
          v-if="(form.email && !emailValid) || (form.password && !passwordValid)"
          class="auth-sheet-field-hint"
        >
          {{ form.email && !emailValid ? copy.auth.invalidEmail : copy.auth.passwordRule }}
        </p>

        <p v-if="props.error" class="auth-sheet-error" role="alert">
          <AlertCircle :size="16" />
          {{ props.error }}
        </p>

        <BaseButton
          type="submit"
          size="lg"
          :disabled="!canSubmit || props.loading"
        >
          <Check v-if="isRegister" :size="18" />
          <LockKeyhole v-else :size="18" />
          {{
            props.loading
              ? copy.common.loading
              : isRegister
                ? copy.auth.completeRegister
                : copy.auth.login
          }}
        </BaseButton>
      </form>

      <p class="auth-sheet-footnote">
        <LockKeyhole :size="14" />
        {{ copy.auth.securityHint }}
      </p>
    </section>
  </van-popup>
</template>
