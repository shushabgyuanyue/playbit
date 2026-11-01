import { useEffect, useLayoutEffect, useRef, type PointerEvent } from "react";

const interactive = "button, a, input, textarea, audio, video, summary, [role='button']";
const MOVE_CANCEL_PX = 10;
const SWIPE_VELOCITY = 0.34;
const SETTLE_FALLBACK_MS = 340;

type GestureAxis = "x" | "y" | null;

interface FeedGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onExit?: () => void;
  onGestureStart?: () => void;
  onTap?: () => void;
}

type PointerState = {
  id: number;
  x: number;
  y: number;
  at: number;
  moved: boolean;
  axis: GestureAxis;
};

function feedback() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(12);
  }
  if (typeof AudioContext === "undefined") return;
  try {
    const context = new AudioContext();
    void context.resume().catch(() => undefined);
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(820, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(360, context.currentTime + 0.07);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.035, context.currentTime + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.08);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.08);
    const tick = context.createOscillator();
    const tickGain = context.createGain();
    tick.type = "triangle";
    tick.frequency.setValueAtTime(1480, context.currentTime);
    tick.frequency.exponentialRampToValueAtTime(860, context.currentTime + 0.035);
    tickGain.gain.setValueAtTime(0.0001, context.currentTime);
    tickGain.gain.exponentialRampToValueAtTime(0.018, context.currentTime + 0.004);
    tickGain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.04);
    tick.connect(tickGain).connect(context.destination);
    tick.start();
    tick.stop(context.currentTime + 0.045);
    oscillator.addEventListener("ended", () => { void context.close(); }, { once: true });
  } catch {
    // The visual and haptic feedback still work when Web Audio is unavailable.
  }
}

export function useFeedSwipe(slide: string, cardId: string, move: (direction: number) => boolean, options: FeedGestureOptions = {}, busySignal = "") {
  const ref = useRef<HTMLElement>(null);
  const pointer = useRef<PointerState | null>(null);
  const nativeScrollPointer = useRef<number | null>(null);
  const settleTimer = useRef<number | null>(null);
  const moving = useRef(move);
  const busy = useRef(slide);
  const gesture = useRef(options);
  useLayoutEffect(() => { moving.current = move; busy.current = slide || busySignal; gesture.current = options; });

  useLayoutEffect(() => {
    clearNativeScroll();
    if (settleTimer.current !== null) window.clearTimeout(settleTimer.current);
    settleTimer.current = null;
    if (!slide.startsWith("swipe-")) {
      reset();
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
      const primaryDelta = event.deltaY;
      const crossDelta = event.deltaX;
      if (Math.abs(primaryDelta) <= Math.abs(crossDelta)) return;
      event.preventDefault();
      const now = performance.now();
      if (busy.current || now < lockedUntil) return;
      const delta = primaryDelta * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientHeight : 1);
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

  function clearNativeScroll() {
    nativeScrollPointer.current = null;
    ref.current?.classList.remove("is-native-scroll");
  }
  function reset() {
    const element = ref.current;
    if (!element) return;
    if (settleTimer.current !== null) window.clearTimeout(settleTimer.current);
    settleTimer.current = null;
    element.classList.remove("is-dragging", "is-settling");
    element.style.removeProperty("--feed-drag");
    element.style.removeProperty("--feed-drag-x");
    element.style.removeProperty("--feed-progress");
    element.style.removeProperty("--feed-rotate");
    element.style.removeProperty("--feed-scale");
    delete element.dataset.dragAxis;
    delete element.dataset.dragDirection;
  }
  function settle() {
    const element = ref.current;
    if (!element) return;
    element.classList.remove("is-dragging");
    element.classList.add("is-settling");
    if (settleTimer.current !== null) window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(reset, SETTLE_FALLBACK_MS);
  }
  function setDragVisual(element: HTMLElement, axis: Exclude<GestureAxis, null>, distance: number, viewport: number) {
    const amount = Math.abs(distance);
    const max = Math.min(Math.max(viewport * .56, 180), 300);
    const response = max * (1 - Math.exp(-amount / (max * .72)));
    const visual = Math.sign(distance) * Math.min(amount * .92, response);
    const progress = Math.min(1, amount / Math.max(1, viewport));
    const rotate = axis === "x" ? (visual / Math.max(1, viewport)) * 4.2 : 0;
    const scale = 1 - progress * .018;
    element.dataset.dragAxis = axis;
    element.dataset.dragDirection = distance < 0 ? "negative" : "positive";
    element.style.setProperty("--feed-drag", `${axis === "y" ? visual : 0}px`);
    element.style.setProperty("--feed-drag-x", `${axis === "x" ? visual : 0}px`);
    element.style.setProperty("--feed-progress", `${progress}`);
    element.style.setProperty("--feed-rotate", `${rotate}deg`);
    element.style.setProperty("--feed-scale", `${scale}`);
  }
  function finish(event: PointerEvent<HTMLElement>, cancelled = false) {
    const start = pointer.current;
    if (!start || event.pointerId !== start.id) return;
    pointer.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    const dy = event.clientY - start.y;
    const dx = event.clientX - start.x;
    const elapsed = Math.max(1, performance.now() - start.at);
    const axis = start.axis ?? (Math.abs(dx) >= Math.abs(dy) ? "x" : "y");
    const distance = axis === "y" ? Math.abs(dy) : Math.abs(dx);
    const threshold = axis === "y"
      ? Math.min(76, event.currentTarget.clientHeight * .1)
      : Math.min(76, event.currentTarget.clientWidth * .18);
    const committed = !cancelled && axis === "y" && (distance > threshold || distance / elapsed > SWIPE_VELOCITY);
    const horizontal = !cancelled && axis === "x" && (distance > threshold || distance / elapsed > SWIPE_VELOCITY);
    if (!committed && !horizontal) {
      if (!start.moved) {
        if (gesture.current.onTap) feedback();
        gesture.current.onTap?.();
      }
      reset();
      return;
    }
    if (horizontal) {
      const callback = dx < 0 ? gesture.current.onSwipeLeft : (gesture.current.onSwipeRight ?? gesture.current.onExit);
      if (callback) {
        settle();
        callback();
      } else reset();
      return;
    }
    if (!moving.current(dy < 0 ? 1 : -1)) reset();
    else settle();
  }
  return {
    ref,
    onPointerDown(event: PointerEvent<HTMLElement>) {
      if (busy.current || !event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) return;
      const target = event.target as Element;
      if (target.closest(interactive)) return;
      if (target.closest(".is-scrollable")) {
        nativeScrollPointer.current = event.pointerId;
        event.currentTarget.classList.add("is-native-scroll");
        return;
      }
      const current: PointerState = { id: event.pointerId, x: event.clientX, y: event.clientY, at: performance.now(), moved: false, axis: null };
      pointer.current = current;
      gesture.current.onGestureStart?.();
      try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* Pointer capture is optional on embedded webviews. */ }
    },
    onPointerMove(event: PointerEvent<HTMLElement>) {
      if (nativeScrollPointer.current === event.pointerId) return;
      const start = pointer.current;
      if (!start || event.pointerId !== start.id) return;
      const dy = event.clientY - start.y;
      const dx = event.clientX - start.x;
      if (!start.axis && Math.hypot(dx, dy) >= MOVE_CANCEL_PX) {
        start.axis = Math.abs(dx) >= Math.abs(dy) ? "x" : "y";
        start.moved = true;
      }
      if (!start.axis) return;
      event.preventDefault();
      event.currentTarget.classList.add("is-dragging");
      setDragVisual(event.currentTarget, start.axis, start.axis === "y" ? dy : dx, start.axis === "y" ? event.currentTarget.clientHeight : event.currentTarget.clientWidth);
    },
    onPointerUp: (event: PointerEvent<HTMLElement>) => {
      if (nativeScrollPointer.current === event.pointerId) { clearNativeScroll(); return; }
      finish(event);
    },
    onPointerCancel: (event: PointerEvent<HTMLElement>) => {
      if (nativeScrollPointer.current === event.pointerId) { clearNativeScroll(); return; }
      finish(event, true);
    },
    onLostPointerCapture() { clearNativeScroll(); if (pointer.current) { pointer.current = null; reset(); } }
  };
}
