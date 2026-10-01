<script setup lang="ts">
import { Download, FileDown, Upload } from "lucide-vue-next";
const props = defineProps<{ busy?: boolean; message?: string }>();
const emit = defineEmits<{ importFile: [file: File]; export: []; template: [] }>();
function chooseFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file) emit("importFile", file);
  (event.target as HTMLInputElement).value = "";
}
</script>

<template>
  <div class="studio-data-transfer">
    <span class="studio-data-transfer-note">CSV / JSON / XLSX 模板</span>
    <span v-if="props.message" class="studio-data-transfer-message">{{ props.message }}</span>
    <button type="button" class="studio-button studio-button-light" :disabled="props.busy" @click="($refs.file as HTMLInputElement).click()"><Upload :size="14" />导入模板</button>
    <input ref="file" class="studio-hidden-file" type="file" accept=".csv,.json,.xlsx,application/json,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" @change="chooseFile" />
    <button type="button" class="studio-button studio-button-light" :disabled="props.busy" @click="emit('template')"><Download :size="14" />下载模板</button>
    <button type="button" class="studio-button studio-button-light" :disabled="props.busy" @click="emit('export')"><FileDown :size="14" />导出筛选结果</button>
  </div>
</template>
