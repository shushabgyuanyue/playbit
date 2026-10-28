// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { usePageMemory } from "./pageMemory";

it("shares mode changes between consumers without letting stale scroll writes replace them", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const host = document.createElement("div");
  const root = createRoot(host);
  const consumers: ReturnType<typeof usePageMemory>[] = [];
  function Consumer({ index }: { index: number }) {
    consumers[index] = usePageMemory();
    return createElement("span", null, consumers[index]!.memory.homePath);
  }
  try {
    await act(async () => root.render(createElement("div", null, createElement(Consumer, { index: 0 }), createElement(Consumer, { index: 1 }))));
    const staleConsumer = consumers[1]!;
    await act(async () => consumers[0]!.remember({ homePath: "/promise" }));
    await act(async () => staleConsumer.remember({ scrollTop: { benefits: 240 } }));
    expect(consumers[0]!.memory.homePath).toBe("/promise");
    expect(consumers[1]!.memory.scrollTop.benefits).toBe(240);
    expect(host.textContent).toBe("/promise/promise");
    expect(JSON.parse(sessionStorage.getItem("playbit:player:page-memory:v1")!).homePath).toBe("/promise");
  } finally {
    await act(async () => root.unmount());
    vi.unstubAllGlobals();
  }
});
