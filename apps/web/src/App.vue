<script setup lang="ts">
import { drawCard as drawLocalCard } from "@playbit/cards";
import { createBetSession, settleBetSession } from "@playbit/game-core";
import type { BetSession, Card, CreateSessionInput, LoginInput, RegisterInput, User } from "@playbit/shared";
import { computed, onMounted, ref } from "vue";
import AccountScreen from "./components/AccountScreen.vue";
import ContractScreen from "./components/ContractScreen.vue";
import CreateBetScreen from "./components/CreateBetScreen.vue";
import DrawCardScreen from "./components/DrawCardScreen.vue";
import HistoryScreen from "./components/HistoryScreen.vue";
import HomeScreen from "./components/HomeScreen.vue";
import SessionScreen from "./components/SessionScreen.vue";
import SignScreen from "./components/SignScreen.vue";
import SettlementScreen from "./components/SettlementScreen.vue";
import { api } from "./services/api";

type Screen =
  | "home"
  | "create"
  | "contract"
  | "draw"
  | "session"
  | "settlement"
  | "history"
  | "sign"
  | "account";

const screen = ref<Screen>("home");
const currentUser = ref<User | null>(null);
const sessions = ref<BetSession[]>([]);
const activeSessionId = ref<string | null>(null);
const activeCard = ref<Card | null>(null);
const drawnCardIds = ref<string[]>([]);
const cardLoading = ref(false);
const signLoading = ref(false);
const authLoading = ref(false);
const activeShareCode = ref<string | null>(null);

const activeSession = computed(() =>
  sessions.value.find((session) => session.id === activeSessionId.value)
);

function persistSessions() {
  localStorage.setItem("playbit.sessions", JSON.stringify(sessions.value));
}

function loadLocalSessions() {
  const stored = localStorage.getItem("playbit.sessions");
  sessions.value = stored ? (JSON.parse(stored) as BetSession[]) : [];
}

function localGuest(): User {
  const stored = localStorage.getItem("playbit.localUser");
  if (stored) {
    return JSON.parse(stored) as User;
  }

  const user: User = {
    id: `local_${Math.random().toString(36).slice(2, 10)}`,
    nickname: "我",
    email: null,
    authLevel: "guest",
    createdAt: new Date().toISOString()
  };
  localStorage.setItem("playbit.localUser", JSON.stringify(user));
  return user;
}

async function ensureIdentity() {
  if (currentUser.value) {
    return currentUser.value;
  }

  if (api.getAuthToken()) {
    try {
      const response = await api.me();
      if (response.user) {
        currentUser.value = response.user;
        return response.user;
      }
    } catch {
      currentUser.value = localGuest();
      return currentUser.value;
    }
  }

  try {
    const response = await api.createGuest("我");
    currentUser.value = response.user;
    return response.user;
  } catch {
    currentUser.value = localGuest();
    return currentUser.value;
  }
}

async function refreshSessions() {
  await ensureIdentity();
  try {
    const response = await api.listSessions();
    if (response.sessions.length > 0) {
      sessions.value = response.sessions;
      persistSessions();
    }
  } catch {
    loadLocalSessions();
  }
}

async function loadShareSession(shareCode: string) {
  activeShareCode.value = shareCode;
  const localSession = sessions.value.find((session) => session.shareCode === shareCode);
  if (localSession) {
    activeSessionId.value = localSession.id;
    screen.value = "sign";
  }

  try {
    const response = await api.getShare(shareCode);
    upsertSession(response.session);
    screen.value = "sign";
  } catch {
    screen.value = "sign";
  }
}

async function createSession(payload: CreateSessionInput) {
  const user = await ensureIdentity();
  const sessionInput = {
    ...payload,
    creatorNickname: user.nickname
  };

  try {
    const response = await api.createSession(sessionInput);
    sessions.value = [response.session, ...sessions.value.filter((item) => item.id !== response.session.id)];
    activeSessionId.value = response.session.id;
  } catch {
    const session = createBetSession(sessionInput, user.id);
    sessions.value = [session, ...sessions.value];
    activeSessionId.value = session.id;
  }

  persistSessions();
  screen.value = "contract";
}

async function drawCard() {
  cardLoading.value = true;

  try {
    const response = await api.drawCard(drawnCardIds.value);
    activeCard.value = response.card;
  } catch {
    activeCard.value = drawLocalCard(drawnCardIds.value);
  } finally {
    if (activeCard.value) {
      drawnCardIds.value = [...drawnCardIds.value, activeCard.value.id];
    }
    cardLoading.value = false;
  }
}

async function settleSession(winnerId: string, fulfilled: boolean) {
  if (!activeSession.value) {
    return;
  }

  try {
    const response = await api.settleSession(activeSession.value.id, winnerId, fulfilled);
    upsertSession(response.session);
  } catch {
    upsertSession(settleBetSession(activeSession.value, winnerId, fulfilled));
  }

  persistSessions();
  screen.value = "settlement";
}

function upsertSession(session: BetSession) {
  sessions.value = [session, ...sessions.value.filter((candidate) => candidate.id !== session.id)];
  activeSessionId.value = session.id;
}

function openSession(session: BetSession) {
  activeSessionId.value = session.id;
  screen.value = session.winnerId ? "settlement" : session.status === "active" ? "session" : "contract";
}

async function copyShareText() {
  if (!activeSession.value) {
    return;
  }

  const session = activeSession.value;
  const winner = session.participants.find((participant) => participant.id === session.winnerId)?.nickname;
  const shareLink = `${window.location.origin}${window.location.pathname}?share=${session.shareCode}`;
  const text = winner
    ? `《本局已结案》\n赌局：${session.title}\n胜方：${winner}\n赌注：${session.stake.label} × ${session.stake.quantity}`
    : `《${session.title}》待签约\n赌约：${session.challenge}\n判定：${session.judgmentRule}\n赌注：${session.stake.label} × ${session.stake.quantity}\n签约链接：${shareLink}`;

  await navigator.clipboard?.writeText(text);
}

async function signSession(nickname: string) {
  if (!activeShareCode.value) {
    return;
  }

  await ensureIdentity();
  signLoading.value = true;
  try {
    const response = await api.signShare(activeShareCode.value, nickname);
    upsertSession(response.session);
    persistSessions();
    screen.value = "contract";
  } finally {
    signLoading.value = false;
  }
}

async function registerAccount(payload: RegisterInput) {
  authLoading.value = true;
  try {
    const response = await api.register(payload);
    currentUser.value = response.user;
    await refreshSessions();
    screen.value = "home";
  } finally {
    authLoading.value = false;
  }
}

async function loginAccount(payload: LoginInput) {
  authLoading.value = true;
  try {
    const response = await api.login(payload);
    currentUser.value = response.user;
    await refreshSessions();
    screen.value = "home";
  } finally {
    authLoading.value = false;
  }
}

onMounted(() => {
  loadLocalSessions();
  const shareCode = new URLSearchParams(window.location.search).get("share");
  if (shareCode) {
    void ensureIdentity();
    void loadShareSession(shareCode);
    return;
  }
  void ensureIdentity();
  void refreshSessions();
});
</script>

<template>
  <main class="app-shell">
    <div class="mobile-frame">
      <HomeScreen
        v-if="screen === 'home'"
        :user="currentUser"
        @create="screen = 'create'"
        @draw="
          screen = 'draw';
          if (!activeCard) drawCard();
        "
        @history="screen = 'history'"
        @account="screen = 'account'"
      />
      <AccountScreen
        v-else-if="screen === 'account'"
        :user="currentUser"
        :loading="authLoading"
        @back="screen = 'home'"
        @register="registerAccount"
        @login="loginAccount"
      />
      <CreateBetScreen v-else-if="screen === 'create'" @back="screen = 'home'" @submit="createSession" />
      <ContractScreen
        v-else-if="screen === 'contract' && activeSession"
        :session="activeSession"
        @back="screen = 'create'"
        @copy-share="copyShareText"
        @start="screen = 'session'"
      />
      <DrawCardScreen
        v-else-if="screen === 'draw'"
        :card="activeCard"
        :loading="cardLoading"
        @back="screen = 'home'"
        @draw="drawCard"
        @accept="createSession"
      />
      <SessionScreen
        v-else-if="screen === 'session' && activeSession"
        :session="activeSession"
        @back="screen = 'home'"
        @settle="settleSession"
      />
      <SettlementScreen
        v-else-if="screen === 'settlement' && activeSession"
        :session="activeSession"
        @copy-share="copyShareText"
        @fulfill="settleSession(activeSession.winnerId ?? activeSession.participants[0].id, true)"
        @home="screen = 'home'"
      />
      <HistoryScreen
        v-else-if="screen === 'history'"
        :sessions="sessions"
        @back="screen = 'home'"
        @open="openSession"
      />
      <SignScreen
        v-else-if="screen === 'sign'"
        :session="activeSession ?? null"
        :loading="signLoading"
        @sign="signSession"
      />
    </div>
  </main>
</template>
