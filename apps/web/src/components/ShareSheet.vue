<script setup lang="ts">
import { copy } from "@playbit/content";
import { Link2, MessageCircle, Send, Share2, UsersRound } from "lucide-vue-next";
import type { SharePayload } from "../composables/playbitFlowHelpers";
import { computed } from "vue";

const props = withDefaults(defineProps<{
  show: boolean;
  payload: SharePayload | null;
  intent?: "sign" | "general";
}>(), {
  intent: "general"
});

const emit = defineEmits<{
  "update:show": [show: boolean];
  nativeShare: [];
  copy: [];
}>();

const channels = [
  { key: "wechat", label: copy.share.channels.wechat, icon: MessageCircle, tone: "wechat" },
  { key: "moments", label: copy.share.channels.moments, icon: UsersRound, tone: "moments" },
  { key: "qq", label: copy.share.channels.qq, icon: Send, tone: "qq" },
  { key: "weibo", label: copy.share.channels.weibo, icon: Share2, tone: "weibo" },
  { key: "copy", label: copy.share.channels.copy, icon: Link2, tone: "copy" }
] as const;

const panelTitle = computed(() => props.intent === "sign" ? copy.share.signPanelTitle : copy.share.panelTitle);
const panelHint = computed(() => props.intent === "sign" ? copy.share.signPanelHint : copy.share.panelHint);
const nativeShareLabel = computed(() => props.intent === "sign" ? copy.share.signNativeShare : copy.share.nativeShare);

function channelLabel(key: (typeof channels)[number]["key"]) {
  return key === "copy" && props.intent === "sign" ? copy.share.signCopy : copy.share.channels[key];
}

function copyAndClose() {
  emit("copy");
  emit("update:show", false);
}

function shareAndClose() {
  emit("nativeShare");
  emit("update:show", false);
}
</script>

<template>
  <van-popup
    :show="show"
    round
    position="bottom"
    teleport="body"
    class="life-sheet-popup share-sheet-popup"
    @update:show="emit('update:show', $event)"
  >
    <section class="share-sheet">
      <header class="share-sheet-header">
        <strong>{{ panelTitle }}</strong>
        <p>{{ panelHint }}</p>
      </header>

      <button type="button" class="share-native-button" :disabled="!payload" @click="shareAndClose">
        <span>
          <Share2 :size="18" />
        </span>
        {{ nativeShareLabel }}
      </button>

      <div class="share-channel-grid">
        <button
          v-for="channel in channels"
          :key="channel.key"
          type="button"
          class="share-channel"
          :class="`tone-${channel.tone}`"
          :disabled="!payload"
          @click="copyAndClose"
        >
          <span>
            <component :is="channel.icon" :size="18" />
          </span>
          <strong>{{ channelLabel(channel.key) }}</strong>
        </button>
      </div>

      <p class="share-sheet-caption">{{ copy.share.channelHint }}</p>
    </section>
  </van-popup>
</template>
