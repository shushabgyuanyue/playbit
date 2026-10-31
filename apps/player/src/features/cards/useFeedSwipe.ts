import { useEffect, useLayoutEffect, useRef, type PointerEvent } from "react";

const interactive = "button, a, input, textarea, audio, video, summary, [role='button']";
const HOLD_TO_FLIP_MS = 680;
const HOLD_TO_COLLECT_MS = 2200;
const MOVE_CANCEL_PX = 10;
const SWIPE_VELOCITY = 0.34;

type GestureAxis = "x" | "y" | null;

interface FeedGestureOptions {
  onHoldFlip?: () => void;
  onHoldCollect?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onExit?: () => void;
  onGestureStart?: () => void;
  onTap?: () => void;
  canHold?: () => boolean;
}

type PointerState = {
  id: number;
  x: number;
  y: number;
  at: number;
  moved: boolean;
  holdEnabled: boolean;
  holdTriggered: boolean;
  collectTriggered: boolean;
  axis: GestureAxis;
  flipTimer?: number;
  collectTimer?: number;
  holdFrame?: number;
};

function feedback(kind: "flip" | "collect") {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(kind === "flip" ? 12 : [10, 28, 16]);
  }
  if (typeof AudioContext === "undefined") return;
  try {
    const context = new AudioContext();
    void context.resume().catch(() => undefined);
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = kind === "flip" ? "sine" : "triangle";
    oscillator.frequency.setValueAtTime(kind === "flip" ? 820 : 420, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(kind === "flip" ? 360 : 280, context.currentTime + 0.07);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(kind === "flip" ? 0.035 : 0.045, context.currentTime + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.08);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.08);
    if (kind === "flip") {
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
    }
    oscillator.addEventListener("ended", () => { void context.close(); }, { once: true });
  } catch {
    // The visual and haptic feedback still work when Web Audio is unavailable.
  }
}

export function useFeedSwipe(slide: string, cardId: string, move: (direction: number) => boolean, options: FeedGestureOptions = {}) {
  const ref = useRef<HTMLElement>(null);
  const pointer = useRef<PointerState | null>(null);
  const nativeScrollPointer = useRef<number | null>(null);
  const moving = useRef(move);
  const busy = useRef(slide);
  const gesture = useRef(options);
  useLayoutEffect(() => { moving.current = move; busy.current = slide; gesture.current = options; });

  useLayoutEffect(() => {
    clearNativeScroll();
    if (!slide.startsWith("swipe-")) {
      ref.current?.style.removeProperty("--feed-drag");
      ref.current?.style.removeProperty("--feed-drag-x");
      ref.current?.classList.remove("is-dragging");
    }
    cancelHold();
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

  function cancelHold() {
    const current = pointer.current;
    if (current?.flipTimer) window.clearTimeout(current.flipTimer);
    if (current?.collectTimer) window.clearTimeout(current.collectTimer);
    clearHoldVisuals();
    if (current) {
      current.flipTimer = undefined;
      current.collectTimer = undefined;
    }
  }
  function clearHoldVisuals() {
    const current = pointer.current;
    if (current?.holdFrame) window.cancelAnimationFrame(current.holdFrame);
    if (current) {
      current.holdFrame = undefined;
    }
    ref.current?.classList.remove("is-holding", "is-hold-ready", "is-hold-complete");
    ref.current?.style.removeProperty("--hold-progress");
  }
  function clearNativeScroll() {
    nativeScrollPointer.current = null;
    ref.current?.classList.remove("is-native-scroll");
  }
  function updateHoldProgress(current: PointerState) {
    if (pointer.current !== current || !current.holdEnabled || current.moved) return;
    const progress = Math.min(1, Math.max(0, (performance.now() - current.at) / HOLD_TO_FLIP_MS));
    ref.current?.style.setProperty("--hold-progress", progress.toFixed(3));
    current.holdFrame = window.requestAnimationFrame(() => updateHoldProgress(current));
  }
  function reset() {
    cancelHold();
    ref.current?.classList.remove("is-dragging");
    ref.current?.style.removeProperty("--feed-drag");
    ref.current?.style.removeProperty("--feed-drag-x");
  }
  function finish(event: PointerEvent<HTMLElement>, cancelled = false) {
    const start = pointer.current;
    if (!start || event.pointerId !== start.id) return;
    const held = start.holdTriggered;
    cancelHold();
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
    if (held) { reset(); return; }
    if (!committed && !horizontal) {
      if (!start.moved) {
        if (gesture.current.onTap) feedback("flip");
        gesture.current.onTap?.();
      }
      reset();
      return;
    }
    if (horizontal) {
      reset();
      if (dx < 0) gesture.current.onSwipeLeft?.();
      else (gesture.current.onSwipeRight ?? gesture.current.onExit)?.();
      return;
    }
    if (!moving.current(dy < 0 ? 1 : -1)) reset();
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
      const current: PointerState = { id: event.pointerId, x: event.clientX, y: event.clientY, at: performance.now(), moved: false, holdEnabled: gesture.current.canHold?.() ?? true, holdTriggered: false, collectTriggered: false, axis: null };
      pointer.current = current;
      gesture.current.onGestureStart?.();
      if (current.holdEnabled) {
        event.currentTarget.classList.add("is-holding");
        event.currentTarget.style.setProperty("--hold-progress", "0");
        current.holdFrame = window.requestAnimationFrame(() => updateHoldProgress(current));
      }
      current.flipTimer = window.setTimeout(() => {
        if (pointer.current !== current || !current.holdEnabled || current.moved || current.holdTriggered) return;
        current.holdTriggered = true;
        ref.current?.classList.add("is-hold-ready");
        feedback("flip");
        clearHoldVisuals();
        gesture.current.onHoldFlip?.();
      }, HOLD_TO_FLIP_MS);
      current.collectTimer = window.setTimeout(() => {
        if (pointer.current !== current || !current.holdEnabled || current.moved || current.collectTriggered) return;
        current.collectTriggered = true;
        if (!current.holdTriggered) ref.current?.classList.add("is-hold-complete");
        feedback("collect");
        gesture.current.onHoldCollect?.();
      }, HOLD_TO_COLLECT_MS);
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
        cancelHold();
      }
      if (!start.axis) return;
      event.preventDefault();
      const primary = start.axis === "y" ? dy : 0;
      const cross = start.axis === "x" ? dx : 0;
      event.currentTarget.classList.add("is-dragging");
      event.currentTarget.style.setProperty("--feed-drag", `${primary}px`);
      event.currentTarget.style.setProperty("--feed-drag-x", `${cross}px`);
    },
    onPointerUp: (event: PointerEvent<HTMLElement>) => {
      if (nativeScrollPointer.current === event.pointerId) { clearNativeScroll(); return; }
      finish(event);
    },
    onPointerCancel: (event: PointerEvent<HTMLElement>) => {
      if (nativeScrollPointer.current === event.pointerId) { clearNativeScroll(); return; }
      finish(event, true);
    },
    onLostPointerCapture() { clearNativeScroll(); if (pointer.current) { cancelHold(); pointer.current = null; reset(); } }
  };
}
