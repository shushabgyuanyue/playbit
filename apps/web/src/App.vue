<script setup lang="ts">
import { drawCard as drawLocalCard } from "@playbit/cards";
import { createBetSession, settleBetSession } from "@playbit/game-core";
import type { BetSession, Card, CreateSessionInput } from "@playbit/shared";
import { computed, onMounted, ref } from "vue";
import ContractScreen from "./components/ContractScreen.vue";
import CreateBetScreen from "./components/CreateBetScreen.vue";
import DrawCardScreen from "./components/DrawCardScreen.vue";
import HistoryScreen from "./components/HistoryScreen.vue";
import HomeScreen from "./components/HomeScreen.vue";
import SessionScreen from "./components/SessionScreen.vue";
import SettlementScreen from "./components/SettlementScreen.vue";
import { api } from "./services/api";

type Screen = "home" | "create" | "contract" | "draw" | "session" | "settlement" | "history";

const screen = ref<Screen>("home");
const sessions = ref<BetSession[]>([]);
const activeSessionId = ref<string | null>(null);
const activeCard = ref<Card | null>(null);
const drawnCardIds = ref<string[]>([]);
const cardLoading = ref(false);

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

async function refreshSessions() {
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

async function createSession(payload: CreateSessionInput) {
  try {
    const response = await api.createSession(payload);
    sessions.value = [response.session, ...sessions.value.filter((item) => item.id !== response.session.id)];
    activeSessionId.value = response.session.id;
  } catch {
    const session = createBetSession(payload);
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
  screen.value = session.winnerId ? "settlement" : "session";
}

async function copyShareText() {
  if (!activeSession.value) {
    return;
  }

  const session = activeSession.value;
  const winner = session.participants.find((participant) => participant.id === session.winnerId)?.nickname;
  const text = winner
    ? `《本局已结案》\n赌局：${session.title}\n胜方：${winner}\n赌注：${session.stake.label}`
    : `《${session.title}》赌约已生成：${session.challenge}；赌注：${session.stake.label}`;

  await navigator.clipboard?.writeText(text);
}

onMounted(() => {
  loadLocalSessions();
  void refreshSessions();
});
</script>

<template>
  <main class="app-shell">
    <div class="mobile-frame">
      <HomeScreen
        v-if="screen === 'home'"
        @create="screen = 'create'"
        @draw="
          screen = 'draw';
          if (!activeCard) drawCard();
        "
        @history="screen = 'history'"
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
    </div>
  </main>
</template>

