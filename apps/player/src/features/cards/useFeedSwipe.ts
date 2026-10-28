import { useEffect, useLayoutEffect, useRef, type PointerEvent } from "react";

const interactive = "button, a, input, textarea, audio, video, summary, [role='button']";

export function useFeedSwipe(slide: string, cardId: string, move: (direction: number) => boolean) {
  const ref = useRef<HTMLElement>(null);
  const pointer = useRef<{ id: number; x: number; y: number; at: number } | null>(null);
  const moving = useRef(move);
  const busy = useRef(slide);
  useLayoutEffect(() => { moving.current = move; busy.current = slide; });

  useLayoutEffect(() => {
    if (!slide.startsWith("swipe-")) {
      ref.current?.style.removeProperty("--feed-drag");
      ref.current?.classList.remove("is-dragging");
    }
    pointer.current = null;
  }, [slide, cardId]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    // Long content scrolls normally; the rest of the screen stays a swipe surface.
    const regions = element.querySelectorAll<HTMLElement>("[data-feed-scroll]");
    const measure = () => regions.forEach(region => region.classList.toggle("is-scrollable", region.scrollHeight > region.clientHeight + 2));
    const observer = new ResizeObserver(measure);
    regions.forEach(region => {
      observer.observe(region);
      Array.from(region.children).forEach(child => observer.observe(child));
    });
    measure();
    return () => observer.disconnect();
  }, [cardId]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let accumulated = 0;
    let last = 0;
    let lockedUntil = 0;
    const onWheel = (event: WheelEvent) => {
      if ((event.target as Element).closest(`${interactive}, .is-scrollable`)) return;
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      event.preventDefault();
      const now = performance.now();
      if (busy.current || now < lockedUntil) return;
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientHeight : 1);
      if (now - last > 160 || Math.sign(accumulated) !== Math.sign(delta)) accumulated = 0;
      last = now;
      accumulated += delta;
      if (Math.abs(accumulated) < 45) return;
      moving.current(accumulated > 0 ? 1 : -1);
      accumulated = 0;
      lockedUntil = now + 650;
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, []);

  function reset() {
    ref.current?.classList.remove("is-dragging");
    ref.current?.style.removeProperty("--feed-drag");
  }
  function finish(event: PointerEvent<HTMLElement>, cancelled = false) {
    const start = pointer.current;
    if (!start || event.pointerId !== start.id) return;
    pointer.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    const dy = event.clientY - start.y;
    const dx = event.clientX - start.x;
    const elapsed = Math.max(1, performance.now() - start.at);
    const threshold = Math.min(90, event.currentTarget.clientHeight * .13);
    const committed = !cancelled && Math.abs(dy) > Math.abs(dx) * 1.15 && (Math.abs(dy) > threshold || (Math.abs(dy) > 28 && Math.abs(dy) / elapsed > .45));
    if (!committed || !moving.current(dy < 0 ? 1 : -1)) reset();
  }
  return {
    ref,
    onPointerDown(event: PointerEvent<HTMLElement>) {
      if (busy.current || !event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) return;
      if ((event.target as Element).closest(`${interactive}, .is-scrollable`)) return;
      pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY, at: performance.now() };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    onPointerMove(event: PointerEvent<HTMLElement>) {
      const start = pointer.current;
      if (!start || event.pointerId !== start.id) return;
      const dy = event.clientY - start.y;
      if (Math.abs(dy) < Math.abs(event.clientX - start.x)) return;
      event.currentTarget.classList.add("is-dragging");
      event.currentTarget.style.setProperty("--feed-drag", `${dy}px`);
    },
    onPointerUp: (event: PointerEvent<HTMLElement>) => finish(event),
    onPointerCancel: (event: PointerEvent<HTMLElement>) => finish(event, true),
    onLostPointerCapture() { if (pointer.current) { pointer.current = null; reset(); } }
  };
}
