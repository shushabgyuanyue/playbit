import { copy } from "@playbit/content";
import type { Agreement, Card, CreateGameInput, Stake, User } from "@playbit/shared";
import { ref, type Ref } from "vue";
import { api, ApiRequestError } from "../services/api";
import type { Screen } from "../types/screen";

type Options = {
  activeCard: Ref<Card | null>;
  activeAgreement: Readonly<Ref<Agreement | undefined>>;
  screen: Ref<Screen>;
  user: Ref<User | null>;
  requireAccount: (screen: Screen) => boolean;
  upsert: (agreement: Agreement) => void;
  open: (agreement: Agreement) => void;
};

function requestId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  // Local-network HTTP previews expose getRandomValues but not randomUUID.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function useGameFlow(options: Options) {
  const busy = ref(false);
  const loading = ref(false);
  const error = ref("");
  const needsLogin = ref(false);
  const inviteCode = ref<string | null>(null);
  const draft = ref<Stake>({ type: "coupon", label: copy.stakes.presets[1].label, fulfilled: false, additions: [] });
  let pendingCreate: CreateGameInput | null = null;
  let pendingJoin: { code: string; revision: number } | null = null;
  let lastRequest: CreateGameInput | null = null;
  let loadVersion = 0;

  async function create(stake: Stake) {
    const card = options.activeCard.value;
    if (busy.value || !card || card.mode !== "versus" || stake.type === "point" || !stake.label.trim()) return;
    const label = stake.label.trim();
    if (!lastRequest || lastRequest.cardId !== card.id || lastRequest.stake.label !== label) {
      lastRequest = { requestId: requestId(), cardId: card.id, stake: { type: stake.type, label } };
    }
    pendingCreate = lastRequest;
    if (!options.requireAccount("draw")) return;
    await submitCreate();
  }

  async function submitCreate() {
    if (!pendingCreate || busy.value) return;
    busy.value = true;
    error.value = "";
    try {
      const { agreement } = await api.createGame(pendingCreate);
      options.upsert(agreement);
      inviteCode.value = agreement.shareCode;
      pendingCreate = null;
      lastRequest = null;
      options.open(agreement);
      const url = new URL(window.location.pathname, window.location.origin);
      url.searchParams.set("game", agreement.shareCode);
      window.history.replaceState(null, "", url);
    } catch { error.value = copy.game.createFailed; }
    finally { busy.value = false; }
  }

  async function load(code: string) {
    inviteCode.value = code;
    const version = ++loadVersion;
    loading.value = true;
    error.value = "";
    needsLogin.value = false;
    options.screen.value = "game";
    try {
      const { agreement } = await api.getShare(code);
      if (version !== loadVersion || options.screen.value !== 'game') return false;
      if (agreement.source !== "card" || !agreement.gameCard) throw new Error("Not a game");
      options.upsert(agreement);
      const member = agreement.participants.some(person => person.userId === options.user.value?.id);
      if (member) options.open(agreement);
      return true;
    } catch (cause) {
      if (version === loadVersion) {
        needsLogin.value = cause instanceof ApiRequestError && cause.status === 403 && !options.user.value;
        error.value = needsLogin.value ? copy.game.privateGame : cause instanceof ApiRequestError && [403, 404].includes(cause.status)
          ? copy.game.unavailable : copy.game.failed;
      }
      return false;
    } finally { if (version === loadVersion) loading.value = false; }
  }

  async function join() {
    const agreement = options.activeAgreement.value;
    if (busy.value || !agreement || agreement.status !== "pending_confirmation") return;
    pendingJoin = { code: agreement.shareCode, revision: agreement.revision };
    if (!options.requireAccount("game")) return;
    await submitJoin();
  }

  async function submitJoin() {
    if (!pendingJoin || busy.value) return;
    const request = pendingJoin;
    busy.value = true;
    error.value = "";
    try {
      const { agreement } = await api.joinGame(request.code, request.revision);
      options.upsert(agreement);
      pendingJoin = null;
      options.open(agreement);
    } catch {
      await load(request.code);
      if (options.activeAgreement.value?.participants.some(person => person.userId === options.user.value?.id)) {
        pendingJoin = null;
      } else if (!error.value) error.value = copy.game.joinFailed;
    } finally { busy.value = false; }
  }

  async function resume() {
    if (pendingCreate) await submitCreate();
    else if (pendingJoin) await submitJoin();
    else if (options.screen.value === "game" && inviteCode.value) await load(inviteCode.value);
  }

  function clearPending() { pendingCreate = null; pendingJoin = null; }
  function reset() {
    clearPending(); lastRequest = null; inviteCode.value = null; error.value = ""; loadVersion++;
    draft.value = { type: "coupon", label: copy.stakes.presets[1].label, fulfilled: false, additions: [] };
  }

  return { busy, loading, error, needsLogin, draft, inviteCode, create, load, join, resume, clearPending, reset,
    login: () => options.requireAccount('game') };
}
