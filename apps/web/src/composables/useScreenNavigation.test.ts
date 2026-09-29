// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { effectScope, nextTick, ref, type EffectScope } from "vue";
import type { Screen } from "../types/screen";
import { useScreenNavigation } from "./useScreenNavigation";

let scope: EffectScope | undefined;

function mountNavigation(initial: Screen = "home") {
  const screen = ref<Screen>(initial);
  scope = effectScope();
  const navigation = scope.run(() => useScreenNavigation(screen))!;
  return { screen, navigation };
}

afterEach(() => {
  scope?.stop();
  scope = undefined;
  window.history.replaceState(null, "", "/");
});

describe("screen navigation", () => {
  it("captures the prior screen and returns to the nearest matching origin", async () => {
    const { screen, navigation } = mountNavigation();
    screen.value = "create";
    screen.value = "contract";
    await nextTick();

    expect(navigation.screenHistory.value).toEqual(["home", "create"]);
    expect(navigation.canGoBack.value).toBe(true);

    navigation.navigateBackTo("create");
    expect(screen.value).toBe("create");
    expect(navigation.screenHistory.value).toEqual(["home"]);
  });

  it("does not add a history entry for replacement navigation", async () => {
    const { screen, navigation } = mountNavigation();
    screen.value = "create";
    await nextTick();
    navigation.replaceCurrentScreen("contract");

    expect(screen.value).toBe("contract");
    expect(navigation.screenHistory.value).toEqual(["home"]);
  });

  it("clears entry parameters when returning home", async () => {
    window.history.replaceState(null, "", "/?share=invite&game=card&flip=again");
    const { screen, navigation } = mountNavigation("sign");
    screen.value = "contract";
    await nextTick();

    navigation.goHome();
    expect(screen.value).toBe("home");
    expect(window.location.search).toBe("");
    expect(navigation.screenHistory.value).toEqual([]);
  });
});
