<script setup lang="ts">
import panda from "../../assets/brand-panda.webp";
import rabbit from "../../assets/brand-rabbit.webp";
import rabbitWhite from "../../assets/brand-rabbit-white.webp";
import pandaWatermark from "../../assets/home-panda-watermark.webp";
import pandaLogo from "../../assets/brand-panda-logo.webp";
import rabbitLogo from "../../assets/brand-rabbit-logo.webp";

const images = { panda, rabbit, "rabbit-white": rabbitWhite, "panda-watermark": pandaWatermark,
  "panda-logo": pandaLogo, "rabbit-logo": rabbitLogo };
defineProps<{ variant: keyof typeof images }>();
</script>

<template>
  <img class="pb-brand-mascot" :src="images[variant]" alt="" aria-hidden="true" draggable="false" />
</template>
