// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useFeedSwipe } from "./useFeedSwipe";

let host: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
let surface: HTMLElement;
let now: number;
const move = vi.fn<(direction: number) => boolean>();

function Harness({ slide = "", cardId = "first" }) {
  const swipe = useFeedSwipe(slide, cardId, move);
  return createElement("section", swipe,
    createElement("p", null, "Content"),
    createElement("button", null, "Flip"),
    createElement("div", { className: "is-scrollable" }, "Long rules"));
}
function pointerAt(target: Element, type: string, x: number, y: number, isPrimary = true) {
  target.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 1, pointerType: "touch", clientX: x, clientY: y, isPrimary }));
}
function pointer(target: Element, type: string, y: number, isPrimary = true) {
  pointerAt(target, type, 100, y, isPrimary);
}
beforeEach(async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.useFakeTimers();
  now = 0;
  vi.spyOn(performance, "now").mockImplementation(() => now);
  move.mockReset().mockReturnValue(true);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root.render(createElement(Harness, {})));
  surface = host.querySelector("section")!;
  let captured = false;
  Object.defineProperties(surface, {
    clientHeight: { value: 600 },
    clientWidth: { value: 600 },
    setPointerCapture: { value: () => { captured = true; } },
    hasPointerCapture: { value: () => captured },
    releasePointerCapture: { value: () => { captured = false; } }
  });
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("tracks the finger, keeps the release position for the transition, then resets on the next card", async () => {
  pointer(surface.querySelector("p")!, "pointerdown", 400);
  now = 250;
  pointer(surface, "pointermove", 240);
  const drag = Number.parseFloat(surface.style.getPropertyValue("--feed-drag"));
  expect(drag).toBeLessThan(-100);
  expect(drag).toBeGreaterThan(-160);
  expect(Number.parseFloat(surface.style.getPropertyValue("--feed-progress"))).toBeCloseTo(.2667, 3);
  expect(surface.dataset.dragAxis).toBe("y");
  pointer(surface, "pointerup", 240);
  expect(move).toHaveBeenCalledExactlyOnceWith(1);
  expect(surface.style.getPropertyValue("--feed-drag")).toBe(`${drag}px`);
  expect(surface.classList.contains("is-settling")).toBe(true);
  await act(async () => root.render(createElement(Harness, { slide: "enter-up", cardId: "next" })));
  expect(surface.style.getPropertyValue("--feed-drag")).toBe("");
  expect(surface.classList.contains("is-dragging")).toBe(false);
});

it("uses left swipe to enter same-type mode and right swipe to exit it", async () => {
  const enter = vi.fn();
  const exit = vi.fn();
  function TypeModeHarness() {
    const swipe = useFeedSwipe("", "type-mode", move, { onSwipeLeft: enter, onSwipeRight: exit });
    return createElement("section", swipe, createElement("p", null, "Content"));
  }
  await act(async () => root.render(createElement(TypeModeHarness)));
  surface = host.querySelector("section")!;
  Object.defineProperties(surface, {
    clientHeight: { value: 600 }, clientWidth: { value: 600 },
    setPointerCapture: { value: () => undefined }, hasPointerCapture: { value: () => false }, releasePointerCapture: { value: () => undefined }
  });
  pointerAt(surface.querySelector("p")!, "pointerdown", 420, 300);
  pointerAt(surface, "pointermove", 220, 300);
  pointerAt(surface, "pointerup", 220, 300);
  expect(enter).toHaveBeenCalledOnce();
  expect(move).not.toHaveBeenCalled();
  pointerAt(surface.querySelector("p")!, "pointerdown", 220, 300);
  pointerAt(surface, "pointermove", 440, 300);
  pointerAt(surface, "pointerup", 440, 300);
  expect(exit).toHaveBeenCalledOnce();
  expect(move).not.toHaveBeenCalled();
});

it("damps horizontal motion and clears the settling state after the mode transition", async () => {
  const enter = vi.fn();
  function TypeModeHarness() {
    const swipe = useFeedSwipe("", "type-mode-damped", move, { onSwipeLeft: enter });
    return createElement("section", swipe, createElement("p", null, "Content"));
  }
  await act(async () => root.render(createElement(TypeModeHarness)));
  surface = host.querySelector("section")!;
  Object.defineProperties(surface, {
    clientHeight: { value: 600 }, clientWidth: { value: 600 },
    setPointerCapture: { value: () => undefined }, hasPointerCapture: { value: () => false }, releasePointerCapture: { value: () => undefined }
  });
  pointerAt(surface.querySelector("p")!, "pointerdown", 420, 300);
  pointerAt(surface, "pointermove", 120, 300);
  const drag = Number.parseFloat(surface.style.getPropertyValue("--feed-drag-x"));
  expect(drag).toBeLessThan(-150);
  expect(drag).toBeGreaterThan(-300);
  expect(Number.parseFloat(surface.style.getPropertyValue("--feed-scale"))).toBeLessThan(1);
  pointerAt(surface, "pointerup", 120, 300);
  expect(enter).toHaveBeenCalledOnce();
  expect(surface.classList.contains("is-settling")).toBe(true);
  await act(async () => { vi.advanceTimersByTime(340); });
  expect(surface.classList.contains("is-settling")).toBe(false);
  expect(surface.style.getPropertyValue("--feed-drag-x")).toBe("");
});

it("locks the gesture axis after the first meaningful movement", async () => {
  const enter = vi.fn();
  function TypeModeHarness() {
    const swipe = useFeedSwipe("", "type-mode-axis", move, { onSwipeLeft: enter });
    return createElement("section", swipe, createElement("p", null, "Content"));
  }
  await act(async () => root.render(createElement(TypeModeHarness)));
  surface = host.querySelector("section")!;
  Object.defineProperties(surface, {
    clientHeight: { value: 600 }, clientWidth: { value: 600 },
    setPointerCapture: { value: () => undefined }, hasPointerCapture: { value: () => false }, releasePointerCapture: { value: () => undefined }
  });
  pointerAt(surface.querySelector("p")!, "pointerdown", 420, 300);
  pointerAt(surface, "pointermove", 390, 285);
  pointerAt(surface, "pointermove", 395, 220);
  pointerAt(surface, "pointerup", 395, 220);
  expect(enter).toHaveBeenCalledOnce();
  expect(move).not.toHaveBeenCalled();
});

it("hands an overflowing rule region back to native vertical scrolling", async () => {
  function ScrollHarness() {
    const swipe = useFeedSwipe("", "native-scroll", move);
    return createElement("section", swipe, createElement("div", { className: "is-scrollable" }, "Long rules"));
  }
  await act(async () => root.render(createElement(ScrollHarness)));
  surface = host.querySelector("section")!;
  Object.defineProperties(surface, {
    setPointerCapture: { value: () => undefined }, hasPointerCapture: { value: () => false }, releasePointerCapture: { value: () => undefined }
  });
  const scrollRegion = surface.querySelector(".is-scrollable")!;
  pointerAt(scrollRegion, "pointerdown", 100, 300);
  expect(surface.classList.contains("is-native-scroll")).toBe(true);
  pointerAt(surface, "pointerup", 100, 200);
  expect(surface.classList.contains("is-native-scroll")).toBe(false);
  expect(move).not.toHaveBeenCalled();
});

it("does not change cards from controls, long rule scrolling, secondary fingers or cancelled drags", () => {
  for (const target of [surface.querySelector("button")!, surface.querySelector(".is-scrollable")!]) {
    pointer(target, "pointerdown", 400);
    pointer(surface, "pointerup", 100);
  }
  pointer(surface, "pointerdown", 400, false);
  pointer(surface, "pointerup", 100, false);
  pointer(surface, "pointerdown", 400);
  pointer(surface, "pointermove", 200);
  pointer(surface, "pointercancel", 200);
  expect(move).not.toHaveBeenCalled();
  expect(surface.style.getPropertyValue("--feed-drag")).toBe("");
});

it("returns the card to its position when a pending stake blocks a swipe, and ignores wheel inertia", () => {
  move.mockReturnValue(false);
  pointer(surface, "pointerdown", 400);
  now = 250;
  pointer(surface, "pointermove", 200);
  pointer(surface, "pointerup", 200);
  expect(surface.style.getPropertyValue("--feed-drag")).toBe("");
  move.mockClear().mockReturnValue(true);
  for (let i = 0; i < 8; i++) {
    surface.dispatchEvent(new WheelEvent("wheel", { deltaY: 60, bubbles: true, cancelable: true }));
    now += 30;
  }
  expect(move).toHaveBeenCalledExactlyOnceWith(1);
});

it("reports a tap immediately without a hold timer", () => {
  const tap = vi.fn();
  function TapHarness() {
    const swipe = useFeedSwipe("", "tap", move, { onTap: tap });
    return createElement("section", swipe, createElement("p", null, "Content"));
  }
  act(() => root.render(createElement(TapHarness)));
  surface = host.querySelector("section")!;
  pointer(surface.querySelector("p")!, "pointerdown", 400);
  vi.advanceTimersByTime(1200);
  pointer(surface, "pointerup", 400);
  expect(tap).toHaveBeenCalledOnce();
  expect(move).not.toHaveBeenCalled();
  expect(surface.classList.contains("is-holding")).toBe(false);
  expect(surface.style.getPropertyValue("--hold-progress")).toBe("");
});
