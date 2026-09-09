import type { BetSession, CreateSessionInput, Participant } from "@playbit/shared";

function makeId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createBetSession(input: CreateSessionInput, creatorUserId: string | null = null): BetSession {
  const participants: Participant[] = [
    {
      id: makeId("p"),
      nickname: input.creatorNickname ?? "发起方",
      role: "initiator",
      userId: creatorUserId,
      confirmed: true
    }
  ];

  return {
    id: makeId("bet"),
    ownerUserId: creatorUserId,
    title: input.title,
    source: input.source,
    participants,
    challenge: input.challenge ?? input.title,
    judgmentRule: input.judgmentRule,
    stake: input.stake,
    cardId: input.cardId ?? null,
    status: "pending_confirmation",
    winnerId: null,
    loserId: null,
    createdAt: new Date().toISOString(),
    settledAt: null,
    shareCode: makeId("share")
  };
}

export function confirmParticipant(session: BetSession, participantId: string): BetSession {
  const participants = session.participants.map((participant) =>
    participant.id === participantId ? { ...participant, confirmed: true } : participant
  );
  const allConfirmed = participants.every((participant) => participant.confirmed);

  return {
    ...session,
    participants,
    status: allConfirmed ? "active" : session.status
  };
}

export function signCounterparty(
  session: BetSession,
  nickname: string,
  counterpartyUserId: string | null = null
): BetSession {
  const initiator = session.participants.find((participant) => participant.role === "initiator");
  const counterparty = session.participants.find((participant) => participant.role === "counterparty");
  const participants: Participant[] = counterparty
    ? session.participants.map((participant) =>
        participant.role === "counterparty" ? { ...participant, nickname, confirmed: true } : participant
      )
    : [
        ...(initiator ? [initiator] : session.participants),
        { id: makeId("p"), nickname, role: "counterparty", userId: counterpartyUserId, confirmed: true }
      ];

  return {
    ...session,
    participants,
    status: "active"
  };
}

export function settleBetSession(
  session: BetSession,
  winnerId: string,
  fulfilled = false
): BetSession {
  const loser = session.participants.find((participant) => participant.id !== winnerId);

  return {
    ...session,
    winnerId,
    loserId: loser?.id ?? null,
    status: fulfilled ? "fulfilled" : "settling",
    stake: {
      ...session.stake,
      fulfilled
    },
    settledAt: new Date().toISOString()
  };
}

export function generateContractTitle(session: BetSession): string {
  return `关于${session.title}之友好约定`;
}

export function generateSettlementTitle(session: BetSession): string {
  return session.stake.fulfilled ? "本案正式结案" : "本局已结案";
}
