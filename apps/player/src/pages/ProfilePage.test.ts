// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { scenes } from "../data/demo";
import { ProfilePage } from "./ProfilePage";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  notify: vi.fn(),
  update: vi.fn(),
  state: { profileName: "Lin", agreements: [], decks: [], sceneId: "date", deckId: null }
}));

vi.mock("react-router-dom", () => ({ useNavigate: () => mocks.navigate }));
vi.mock("../features/player/PlayerProvider", () => ({ usePlayer: () => ({ state: mocks.state, update: mocks.update, notify: mocks.notify }) }));
vi.mock("../components/ui/Sheet", async () => {
  const React = await vi.importActual<typeof import("react")>("react");
  return {
    Sheet: ({ open, title, children }: { open: boolean; title: string; children: React.ReactNode }) => open
      ? React.createElement("div", { role: "dialog" }, React.createElement("h2", null, title), children)
      : null
  };
});

let host: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.clearAllMocks();
});

it("opens the game page after choosing an official scene from profile", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root.render(createElement(ProfilePage)));

  await act(async () => host.querySelector<HTMLButtonElement>(".profile-section-head button")!.click());
  const scene = scenes[0]!;
  const tile = Array.from(host.querySelectorAll<HTMLButtonElement>(".scene-tile"))
    .find(button => button.textContent?.includes(scene.title));
  expect(tile).toBeDefined();
  await act(async () => tile!.click());

  expect(mocks.update).toHaveBeenCalledOnce();
  expect(mocks.navigate).toHaveBeenCalledExactlyOnceWith("/");
});
