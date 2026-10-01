import { computed, ref, watch, type Ref } from "vue";
import type { Screen } from "../types/screen";

type ScreenNavigationOptions = {
  onHome?: () => void;
};

/**
 * Owns the in-app screen stack. Entry query parameters are consumed once a
 * flow leaves its entry screen and never act as a second navigation system.
 */
export function useScreenNavigation(
  screen: Ref<Screen>,
  options: ScreenNavigationOptions = {}
) {
  const screenHistory = ref<Screen[]>([]);
  const screenRevision = ref(0);
  let suppressScreenHistoryCapture = false;

  watch(screen, (nextScreen, previousScreen) => {
    screenRevision.value += 1;
    if (suppressScreenHistoryCapture) {
      suppressScreenHistoryCapture = false;
      return;
    }
    if (nextScreen === "home") {
      screenHistory.value = [];
      return;
    }
    screenHistory.value.push(previousScreen);
  }, { flush: "sync" });

  const canGoBack = computed(() => screenHistory.value.length > 0);

  function setScreenWithoutCapture(nextScreen: Screen) {
    if (screen.value === nextScreen) return;
    suppressScreenHistoryCapture = true;
    screen.value = nextScreen;
    suppressScreenHistoryCapture = false;
  }

  function clearEntryQuery(screenBeingLeft?: Screen) {
    const key = screenBeingLeft === "game" ? "game"
      : screenBeingLeft === "sign" ? "share"
      : screenBeingLeft === "flip" ? "flip"
      : screenBeingLeft === "couponClaim" ? "coupon"
      : null;
    const url = new URL(window.location.href);
    const keys = key ? [key] : ["share", "game", "flip", "coupon"];
    if (!keys.some((item) => url.searchParams.has(item))) return;
    keys.forEach((item) => url.searchParams.delete(item));
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }

  function goHome() {
    options.onHome?.();
    screenHistory.value = [];
    clearEntryQuery();
    screen.value = "home";
  }

  function navigateBackTo(nextScreen: Screen) {
    if (nextScreen === "home") {
      goHome();
      return;
    }
    const destinationIndex = screenHistory.value.lastIndexOf(nextScreen);
    if (destinationIndex < 0) {
      goHome();
      return;
    }
    screenHistory.value = screenHistory.value.slice(0, destinationIndex);
    clearEntryQuery(screen.value);
    setScreenWithoutCapture(nextScreen);
  }

  function replaceCurrentScreen(nextScreen: Screen) {
    if (nextScreen === "home") screenHistory.value = [];
    setScreenWithoutCapture(nextScreen);
  }

  return {
    screenHistory,
    screenRevision,
    canGoBack,
    setScreenWithoutCapture,
    clearEntryQuery,
    navigateBackTo,
    replaceCurrentScreen,
    goHome
  };
}
