import { onMounted, onUnmounted, ref, watch, type Ref } from "vue";

export function useVisibleStamp(target: Ref<HTMLElement | null>, enabled: () => boolean, identity: () => string) {
  const stamped = ref(false);
  let observer: IntersectionObserver | undefined;
  function observe() {
    observer?.disconnect();
    if (!target.value || !enabled() || stamped.value) return;
    if (!window.IntersectionObserver) { stamped.value = true; return; }
    observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= .55)) {
        stamped.value = true;
        observer?.disconnect();
      }
    }, { threshold: .55, rootMargin: "-60px 0px -110px 0px" });
    observer.observe(target.value);
  }
  watch(identity, () => { stamped.value = false; observe(); }, { flush: "post" });
  watch([target, enabled], observe, { flush: "post" });
  onMounted(observe);
  onUnmounted(() => observer?.disconnect());
  return stamped;
}
