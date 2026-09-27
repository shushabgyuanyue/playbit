<script setup lang="ts">
import { copy } from "@playbit/content";
import type { Participant } from "@playbit/shared";
import { Check, X } from "lucide-vue-next";
import { ref, watch } from "vue";
import pandaArt from "../../assets/result-panda.webp";
import rabbitArt from "../../assets/result-rabbit.webp";
import BaseButton from "../ui/BaseButton.vue";
const props = defineProps<{ show: boolean; participants: Participant[]; loading?: boolean; outcomes?: Record<string, string> }>();
const emit = defineEmits<{ "update:show": [show: boolean]; submit: [id: string] }>();
const selected = ref<string | null>(null);
watch(() => props.show, () => { selected.value = null; });
</script>
<template>
  <van-popup :show="show" position="bottom" round teleport="body" class="life-sheet-popup"
    :close-on-click-overlay="!loading" role="dialog" aria-modal="true" :aria-label="copy.game.chooseWinner" @update:show="emit('update:show', $event)">
    <section class="game-result-sheet">
      <header><h2 class="life-section-title">{{ copy.game.chooseWinner }}</h2>
        <button type="button" class="game-icon-button" :disabled="loading" :aria-label="copy.common.close" @click="emit('update:show', false)"><X :size="20" /></button>
      </header>
      <div class="session-result-options" role="radiogroup" :aria-label="copy.game.chooseWinner">
        <button v-for="person in participants" :key="person.id" type="button" class="session-result-option"
          :class="{ selected: selected === person.id }" :data-party="person.role" :disabled="loading"
          role="radio" :aria-checked="selected === person.id" @click="selected = person.id">
          <img class="session-result-mascot" :src="person.role === 'initiator' ? pandaArt : rabbitArt" alt="" />
          <span class="session-result-radio" aria-hidden="true"><Check v-if="selected === person.id" :size="13" /></span>
          <span class="session-result-person"><strong>{{ person.nickname }}</strong></span>
          <span class="session-result-label">{{ copy.session.winnerChoice }}</span>
        </button>
      </div>
      <p class="life-section-caption">{{ selected && outcomes?.[selected] ? outcomes[selected] : copy.game.resultHint }}</p>
      <BaseButton size="lg" :loading="loading" :disabled="!selected" @click="selected && emit('submit', selected)">{{ copy.game.submitResult }}</BaseButton>
    </section>
  </van-popup>
</template>
<style scoped>
.game-result-sheet { display: grid; gap: 16px; max-height: 90dvh; overflow-y: auto; padding: 16px 16px calc(20px + env(safe-area-inset-bottom)); }
header { display: flex; justify-content: space-between; align-items: center; }
.game-icon-button { border: 0; background: transparent; color: var(--pb-text-2); width: 44px; height: 44px; display: grid; place-items: center; }
</style>
