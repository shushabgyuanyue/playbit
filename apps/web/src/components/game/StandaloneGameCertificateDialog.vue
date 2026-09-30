<script setup lang="ts">
import { standaloneGameCopy as copy } from "@playbit/content";
import { Download, Share2, Trophy, X } from "lucide-vue-next";
import { computed, nextTick, ref, watch } from "vue";
import { showToast } from "vant";
import type { LocalPlayer } from "../../composables/useStandaloneGameFlow";
import winnerTemplateUrl from "../../assets/certificates/result-winner.jpg";

const props = defineProps<{
  open: boolean;
  players: LocalPlayer[];
}>();

const emit = defineEmits<{ close: [] }>();
const canvas = ref<HTMLCanvasElement | null>(null);
const winnerInput = ref("");
const busy = ref(false);

const rankedPlayers = computed(() => [...props.players].sort((a, b) => b.score - a.score));
const topPlayer = computed(() => rankedPlayers.value[0] ?? null);
const allScoresZero = computed(() => !topPlayer.value || topPlayer.value.score <= 0);
const winnerName = computed(() => allScoresZero.value
  ? winnerInput.value.trim()
  : topPlayer.value?.label.trim() || "现场冠军");
const canExport = computed(() => Boolean(winnerName.value));

function fitText(ctx: CanvasRenderingContext2D, value: string, maxWidth: number, maxSize: number, minSize: number) {
  let size = maxSize;
  while (size > minSize) {
    ctx.font = `600 ${size}px "STSong", "Songti SC", "SimSun", serif`;
    if (ctx.measureText(value).width <= maxWidth) break;
    size -= 2;
  }
  ctx.font = `600 ${size}px "STSong", "Songti SC", "SimSun", serif`;
  let display = value;
  while (ctx.measureText(display).width > maxWidth && display.length > 1) display = `${display.slice(0, -1)}…`;
  return display;
}

function formatDate() {
  const date = new Date();
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("CERTIFICATE_ASSET_FAILED"));
    image.src = src;
  });
}

async function render() {
  const target = canvas.value;
  if (!target || !winnerName.value) return;
  const image = await loadImage(winnerTemplateUrl);
  target.width = 1122;
  target.height = 1402;
  const ctx = target.getContext("2d");
  if (!ctx) return;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(image, 0, 0, target.width, target.height);

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#653b0d";
  ctx.font = `600 74px "STSong", "Songti SC", "SimSun", serif`;
  ctx.fillText(fitText(ctx, winnerName.value, 540, 74, 36), 561, 593);

  ctx.textAlign = "left";
  ctx.fillStyle = "#653b0d";
  ctx.font = `500 28px "STKaiti", "KaiTi", "Kaiti SC", cursive`;
  ctx.fillText(formatDate(), 423, 1165);

  // Keep the same restrained red seal language used by contract documents.
  ctx.save();
  ctx.translate(924, 1131);
  ctx.rotate(-0.14);
  ctx.globalAlpha = 0.72;
  ctx.strokeStyle = "#a63739";
  ctx.fillStyle = "#a63739";
  ctx.lineWidth = 3;
  for (const radius of [66, 57]) {
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.textAlign = "center";
  ctx.font = `700 23px "STSong", "Songti SC", "SimSun", serif`;
  ctx.fillText("结果留存", 0, 8);
  ctx.font = `16px "STSong", "Songti SC", "SimSun", serif`;
  ctx.fillText("PLAYBIT", 0, -24);
  ctx.restore();
}

async function imageFile() {
  const target = canvas.value;
  if (!target) throw new Error("CERTIFICATE_NOT_READY");
  return new Promise<File>((resolve, reject) => {
    target.toBlob((blob) => {
      if (!blob) {
        reject(new Error("CERTIFICATE_RENDER_FAILED"));
        return;
      }
      resolve(new File([blob], "playbit-champion-certificate.png", { type: "image/png" }));
    }, "image/png");
  });
}

function save(file: File) {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.name;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function exportCertificate(share: boolean) {
  if (busy.value || !canExport.value) return;
  busy.value = true;
  try {
    await render();
    const file = await imageFile();
    if (share && navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title: `${winnerName.value}的比赛证书`, files: [file] });
    } else {
      save(file);
      showToast(share ? "当前设备不支持系统分享，已保存证书" : "证书已保存");
    }
  } catch (error) {
    if (!(error instanceof Error && error.name === "AbortError")) showToast("证书生成失败，请稍后再试");
  } finally {
    busy.value = false;
  }
}

async function refresh() {
  await nextTick();
  if (props.open && canExport.value) {
    try { await render(); } catch { /* The export action will show the actionable error. */ }
  }
}

watch(() => [props.open, winnerName.value], () => { void refresh(); }, { immediate: true });
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="standalone-certificate-overlay" @click.self="emit('close')">
      <section class="standalone-certificate-dialog" role="dialog" aria-modal="true" :aria-label="copy.certificate">
        <header class="standalone-certificate-heading">
          <div><span class="standalone-certificate-kicker"><Trophy :size="14" />{{ copy.certificate }}</span><h2>{{ copy.certificate }}</h2></div>
          <button type="button" class="standalone-certificate-close" aria-label="关闭证书" @click="emit('close')"><X :size="18" /></button>
        </header>
        <p class="standalone-certificate-intro">{{ allScoresZero ? "积分还没有结果，填入本场冠军后即可颁发。" : `积分榜第一名：${winnerName}` }}</p>
        <label v-if="allScoresZero" class="standalone-certificate-input">
          <span>冠军姓名</span>
          <input v-model="winnerInput" maxlength="20" placeholder="输入冠军名字" autofocus @keyup.enter="void exportCertificate(false)" />
        </label>
        <canvas ref="canvas" class="standalone-certificate-canvas" :aria-label="copy.certificate" />
        <div class="standalone-certificate-actions">
          <button type="button" class="standalone-certificate-action" :disabled="busy || !canExport" @click="void exportCertificate(false)"><Download :size="16" />保存证书</button>
          <button type="button" class="standalone-certificate-action is-share" :disabled="busy || !canExport" @click="void exportCertificate(true)"><Share2 :size="16" />分享证书</button>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.standalone-certificate-overlay { position: fixed; inset: 0; z-index: 120; display: grid; place-items: center; overflow: auto; background: rgba(24, 35, 50, .38); padding: 16px; backdrop-filter: blur(5px); }
.standalone-certificate-dialog { width: min(440px, 100%); max-height: calc(100dvh - 32px); overflow: auto; border: 1px solid rgba(172, 132, 70, .3); border-radius: 18px; background: #fffdf7; padding: 14px; box-shadow: 0 24px 80px rgba(24, 35, 50, .28); animation: standalone-certificate-in 360ms cubic-bezier(.2, .85, .25, 1.1) both; }
.standalone-certificate-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.standalone-certificate-heading h2 { margin: 3px 0 0; color: #653b0d; font-family: var(--pb-font-serif); font-size: 21px; }
.standalone-certificate-kicker { display: inline-flex; align-items: center; gap: 5px; color: var(--pb-ink-gold); font-size: var(--pb-font-xs); font-weight: 700; }
.standalone-certificate-close { display: inline-grid; width: 32px; height: 32px; place-items: center; border: 0; border-radius: 50%; background: rgba(145, 111, 48, .1); color: #76531e; }
.standalone-certificate-intro { margin: 9px 0 11px; color: var(--pb-text-2); font-size: var(--pb-font-xs); line-height: 1.5; }
.standalone-certificate-input { display: grid; gap: 5px; margin-bottom: 10px; color: #76531e; font-size: var(--pb-font-xs); font-weight: 700; }
.standalone-certificate-input input { min-height: 38px; border: 1px solid rgba(145, 111, 48, .3); border-radius: 9px; background: #fffefa; color: var(--pb-text-1); padding: 0 10px; font: inherit; }
.standalone-certificate-canvas { display: block; width: 100%; height: auto; border: 1px solid rgba(145, 111, 48, .22); box-shadow: 0 8px 22px rgba(93, 68, 26, .12); }
.standalone-certificate-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-top: 12px; }
.standalone-certificate-action { display: inline-flex; min-height: 40px; align-items: center; justify-content: center; gap: 5px; border: 1px solid rgba(145, 111, 48, .3); border-radius: 9px; background: transparent; color: #76531e; padding: 0 8px; font: inherit; font-size: var(--pb-font-sm); font-weight: 600; }
.standalone-certificate-action.is-share { border-color: #9f6d1e; background: #9f6d1e; color: #fff; }
.standalone-certificate-action:disabled { cursor: wait; opacity: .5; }
@keyframes standalone-certificate-in { from { opacity: 0; transform: translateY(16px) scale(.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
</style>
