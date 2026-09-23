<script setup lang="ts">
import { copy } from "@playbit/content";
import { Eraser } from "lucide-vue-next";
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";

const props = defineProps<{
  label: string;
  modelValue?: string;
}>();

const emit = defineEmits<{
  change: [value: string];
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const drawing = ref(false);
const hasInk = ref(false);
let context: CanvasRenderingContext2D | null = null;

function drawValue(value?: string) {
  const canvas = canvasRef.value;
  if (!canvas || !context) {
    return;
  }
  if (!value) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    hasInk.value = false;
    return;
  }

  const image = new Image();
  image.onload = () => {
    context?.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    context?.drawImage(image, 0, 0, canvas.clientWidth, canvas.clientHeight);
    hasInk.value = true;
  };
  image.src = value;
}

function setupCanvas() {
  const canvas = canvasRef.value;
  if (!canvas) {
    return;
  }

  const rect = canvas.getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;
  const previousValue = hasInk.value ? canvas.toDataURL("image/png") : props.modelValue;
  canvas.width = Math.max(1, Math.floor(rect.width * scale));
  canvas.height = Math.max(1, Math.floor(rect.height * scale));
  context = canvas.getContext("2d");
  if (!context) {
    return;
  }
  context.setTransform(scale, 0, 0, scale, 0, 0);
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = 2.4;
  context.strokeStyle = "#1f2329";
  drawValue(previousValue);
}

function point(event: PointerEvent) {
  const canvas = canvasRef.value;
  if (!canvas) {
    return { x: 0, y: 0 };
  }
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}

function emitSignature() {
  const canvas = canvasRef.value;
  emit("change", hasInk.value && canvas ? canvas.toDataURL("image/png") : "");
}

function start(event: PointerEvent) {
  if (!context) {
    setupCanvas();
  }
  const nextPoint = point(event);
  drawing.value = true;
  context?.beginPath();
  context?.moveTo(nextPoint.x, nextPoint.y);
  canvasRef.value?.setPointerCapture(event.pointerId);
}

function move(event: PointerEvent) {
  if (!drawing.value || !context) {
    return;
  }
  const nextPoint = point(event);
  context.lineTo(nextPoint.x, nextPoint.y);
  context.stroke();
  hasInk.value = true;
}

function end(event: PointerEvent) {
  drawing.value = false;
  canvasRef.value?.releasePointerCapture(event.pointerId);
  emitSignature();
}

function clear() {
  const canvas = canvasRef.value;
  if (!canvas || !context) {
    return;
  }
  context.clearRect(0, 0, canvas.width, canvas.height);
  hasInk.value = false;
  emit("change", "");
}

onMounted(() => {
  setupCanvas();
  window.addEventListener("resize", setupCanvas);
});

watch(
  () => props.modelValue,
  async (value) => {
    if (drawing.value) {
      return;
    }
    await nextTick();
    drawValue(value);
  }
);

onBeforeUnmount(() => {
  window.removeEventListener("resize", setupCanvas);
});
</script>

<template>
  <section class="signature-pad">
    <div class="signature-pad-header">
      <span>{{ label }}</span>
      <button type="button" @click="clear">
        <Eraser :size="14" />
        {{ copy.signature.clear }}
      </button>
    </div>
    <canvas
      ref="canvasRef"
      class="signature-pad-canvas"
      :aria-label="label"
      @pointerdown.prevent="start"
      @pointermove.prevent="move"
      @pointerup.prevent="end"
      @pointercancel.prevent="end"
    />
    <p class="signature-pad-hint">{{ copy.signature.hint }}</p>
  </section>
</template>
