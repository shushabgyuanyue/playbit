import { useEffect, useLayoutEffect, useRef, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react";

const interactive = "button, a, input, textarea, audio, video, summary, [role='button']";
const gestureInteractive = ".card-video, .card-audio, .card-voice-player, .card-social, .card-social-action";
const MOVE_CANCEL_PX = 8;
const SWIPE_VELOCITY = 0.42;
const HORIZONTAL_SWIPE_VELOCITY = 0.18;
const SETTLE_FALLBACK_MS = 280;

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
  tapBlocked: boolean;
  nativeScroll: boolean;
  viewport: { width: number; height: number };
};

type PointerLike = Pick<globalThis.PointerEvent, "pointerId" | "clientX" | "clientY">;

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
  const windowPointer = useRef<number | null>(null);
  const windowPointerCleanup = useRef<(() => void) | null>(null);
  const settleTimer = useRef<number | null>(null);
  const suppressClick = useRef(false);
  const moving = useRef(move);
  const busy = useRef(slide);
  const gesture = useRef(options);
  useLayoutEffect(() => { moving.current = move; busy.current = slide || busySignal; gesture.current = options; });

  useLayoutEffect(() => {
    clearNativeScroll();
    stopWindowPointerTracking();
    releasePointerCapture(pointer.current?.id);
    if (settleTimer.current !== null) window.clearTimeout(settleTimer.current);
    settleTimer.current = null;
    if (!slide.startsWith("swipe-")) {
      reset();
    }
    pointer.current = null;
  }, [slide, cardId]);

  useEffect(() => () => {
    stopWindowPointerTracking();
    releasePointerCapture(pointer.current?.id);
  }, []);

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
    ref.current?.classList.remove("is-native-scroll");
  }
  function releasePointerCapture(pointerId: number | undefined) {
    const element = ref.current;
    if (pointerId === undefined || !element?.hasPointerCapture?.(pointerId)) return;
    element.releasePointerCapture(pointerId);
  }
  function stopWindowPointerTracking() {
    windowPointerCleanup.current?.();
    windowPointerCleanup.current = null;
    windowPointer.current = null;
  }
  function startWindowPointerTracking(pointerId: number) {
    if (typeof window === "undefined") return;
    stopWindowPointerTracking();
    windowPointer.current = pointerId;
    const handleUp = (event: globalThis.PointerEvent) => {
      if (windowPointer.current === event.pointerId) finish(event);
    };
    const handleCancel = (event: globalThis.PointerEvent) => {
      if (windowPointer.current === event.pointerId) finish(event, true);
    };
    window.addEventListener("pointerup", handleUp, true);
    window.addEventListener("pointercancel", handleCancel, true);
    windowPointerCleanup.current = () => {
      window.removeEventListener("pointerup", handleUp, true);
      window.removeEventListener("pointercancel", handleCancel, true);
    };
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
    element.style.removeProperty("--feed-visual-progress");
    element.style.removeProperty("--feed-rotate");
    element.style.removeProperty("--feed-scale");
    element.style.removeProperty("--feed-stage-depth-x");
    element.style.removeProperty("--feed-stage-depth-y");
    element.style.removeProperty("--feed-story-depth-x");
    element.style.removeProperty("--feed-story-depth-y");
    element.style.removeProperty("--feed-footer-depth-x");
    element.style.removeProperty("--feed-footer-depth-y");
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
  function suppressSyntheticClick() {
    suppressClick.current = true;
    window.setTimeout(() => { suppressClick.current = false; }, 0);
  }
  function setDragVisual(element: HTMLElement, axis: Exclude<GestureAxis, null>, distance: number, viewport: number) {
    const amount = Math.abs(distance);
    const resistanceStart = viewport * .62;
    const extra = Math.max(0, amount - resistanceStart);
    // Keep the finger one-to-one until most of the surface is revealed, then
    // smoothly reduce the slope. The resisted distance must stay monotonic;
    // otherwise a fast drag can visibly jump backwards near the threshold.
    const blendProgress = Math.min(1, extra / Math.max(1, viewport * .12));
    const blend = blendProgress * blendProgress * (3 - 2 * blendProgress);
    const resistance = 1 - .72 * blend;
    const visualAmount = amount <= resistanceStart ? amount : resistanceStart + extra * resistance;
    const visual = Math.sign(distance) * visualAmount;
    // Keep short drags one-to-one. The rubber-band only starts once most of
    // the next surface is revealed, which is the usual feed interaction.
    const progress = Math.min(1, amount / Math.max(1, viewport));
    const visualProgress = Math.min(1, Math.abs(visual) / Math.max(1, viewport));
    // Horizontal swipes change the play mode, rather than browsing a second
    // card rail. Keep the surface square and full-bleed so the mode handoff
    // never exposes the deck background at a rotated or scaled edge.
    const rotate = 0;
    const scale = 1;
    element.dataset.dragAxis = axis;
    element.dataset.dragDirection = distance < 0 ? "negative" : "positive";
    element.style.setProperty("--feed-drag", `${axis === "y" ? visual : 0}px`);
    element.style.setProperty("--feed-drag-x", `${axis === "x" ? visual : 0}px`);
    element.style.setProperty("--feed-progress", `${progress}`);
    element.style.setProperty("--feed-visual-progress", `${visualProgress}`);
    element.style.setProperty("--feed-rotate", `${rotate}deg`);
    element.style.setProperty("--feed-scale", `${scale}`);
    const depthDistance = -visual;
    const depthX = axis === "x" ? depthDistance : 0;
    const depthY = axis === "y" ? depthDistance : 0;
    element.style.setProperty("--feed-stage-depth-x", `${(depthX * .04).toFixed(2)}px`);
    element.style.setProperty("--feed-stage-depth-y", `${(depthY * .04).toFixed(2)}px`);
    element.style.setProperty("--feed-story-depth-x", `${(depthX * .016).toFixed(2)}px`);
    element.style.setProperty("--feed-story-depth-y", `${(depthY * .016).toFixed(2)}px`);
    element.style.setProperty("--feed-footer-depth-x", `${(depthX * .006).toFixed(2)}px`);
    element.style.setProperty("--feed-footer-depth-y", `${(depthY * .006).toFixed(2)}px`);
  }
  function finish(event: PointerLike, cancelled = false) {
    const start = pointer.current;
    if (!start || event.pointerId !== start.id) return;
    pointer.current = null;
    stopWindowPointerTracking();
    releasePointerCapture(event.pointerId);
    const element = ref.current;
    if (!element) return;
    const dy = event.clientY - start.y;
    const dx = event.clientX - start.x;
    if (start.nativeScroll) {
      clearNativeScroll();
      if (!cancelled && Math.hypot(dx, dy) < MOVE_CANCEL_PX) {
        if (gesture.current.onTap) feedback();
        gesture.current.onTap?.();
      } else if (start.moved) {
        suppressSyntheticClick();
      }
      reset();
      return;
    }
    const elapsed = Math.max(1, performance.now() - start.at);
    const axis = start.axis ?? (Math.abs(dx) >= Math.abs(dy) ? "x" : "y");
    const distance = axis === "y" ? Math.abs(dy) : Math.abs(dx);
    const threshold = axis === "y"
      ? Math.min(76, element.clientHeight * .1)
      : Math.max(30, Math.min(48, element.clientWidth * .1));
    const committed = !cancelled && axis === "y" && (distance > threshold || distance / elapsed > SWIPE_VELOCITY);
    const horizontal = !cancelled && axis === "x" && (distance > threshold || distance / elapsed > HORIZONTAL_SWIPE_VELOCITY);
    if (!committed && !horizontal) {
      if (!start.moved && !start.tapBlocked) {
        if (gesture.current.onTap) feedback();
        gesture.current.onTap?.();
      } else if (start.moved) {
        suppressSyntheticClick();
      }
      reset();
      return;
    }
    suppressSyntheticClick();
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
    onPointerDown(event: ReactPointerEvent<HTMLElement>) {
      if (busy.current || !event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) return;
      const target = event.target instanceof Element ? event.target : null;
      const gestureTarget = Boolean(target?.closest(gestureInteractive));
      if (target?.closest(interactive) && !gestureTarget) return;
      // Only the rules face owns a real inner scroll. The content face is the
      // feed surface, even when its text happens to be taller than the viewport.
      const nativeScroll = Boolean(target?.closest(".card-back [data-feed-scroll].is-scrollable"));
      if (nativeScroll) {
        event.currentTarget.classList.add("is-native-scroll");
      }
      const current: PointerState = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        at: performance.now(),
        moved: false,
        axis: null,
        tapBlocked: gestureTarget,
        nativeScroll,
        viewport: { width: event.currentTarget.clientWidth, height: event.currentTarget.clientHeight }
      };
      pointer.current = current;
      gesture.current.onGestureStart?.();
      startWindowPointerTracking(event.pointerId);
    },
    onPointerMove(event: ReactPointerEvent<HTMLElement>) {
      const start = pointer.current;
      if (!start || event.pointerId !== start.id) return;
      const dy = event.clientY - start.y;
      const dx = event.clientX - start.x;
      if (start.nativeScroll && !start.axis) {
        if (Math.hypot(dx, dy) < MOVE_CANCEL_PX) return;
        if (Math.abs(dy) > Math.abs(dx)) {
          pointer.current = null;
          stopWindowPointerTracking();
          clearNativeScroll();
          return;
        }
        start.nativeScroll = false;
      }
      if (!start.axis && Math.hypot(dx, dy) >= MOVE_CANCEL_PX) {
        const horizontal = Math.abs(dx) > Math.abs(dy) * 1.08;
        const vertical = Math.abs(dy) > Math.abs(dx) * 1.08;
        if (!horizontal && !vertical) return;
        start.axis = horizontal ? "x" : "y";
        start.moved = true;
        try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* Pointer capture is optional on embedded webviews. */ }
      }
      if (!start.axis) return;
      event.preventDefault();
      event.currentTarget.classList.add("is-dragging");
      setDragVisual(event.currentTarget, start.axis, start.axis === "y" ? dy : dx, start.axis === "y" ? start.viewport.height : start.viewport.width);
    },
    onPointerUp: (event: ReactPointerEvent<HTMLElement>) => {
      finish(event);
    },
    onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => {
      finish(event, true);
    },
    onClickCapture(event: ReactMouseEvent<HTMLElement>) {
      if (!suppressClick.current) return;
      suppressClick.current = false;
      event.preventDefault();
      event.stopPropagation();
    },
    onLostPointerCapture() { clearNativeScroll(); }
  };
}
