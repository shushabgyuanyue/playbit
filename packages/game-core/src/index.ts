import type { BetSession, Boost, CreateSessionInput, Participant, StakeAddition } from "@playbit/shared";

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
      confirmed: true,
      signatureDataUrl: input.creatorSignatureDataUrl
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
    boosts: [],
    revision: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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
  counterpartyUserId: string | null = null,
  signatureDataUrl: string | null = null
): BetSession {
  const initiator = session.participants.find((participant) => participant.role === "initiator");
  const counterparty = session.participants.find((participant) => participant.role === "counterparty");
  const participants: Participant[] = counterparty
    ? session.participants.map((participant) =>
        participant.role === "counterparty"
          ? { ...participant, nickname, userId: counterpartyUserId, confirmed: true, signatureDataUrl }
          : participant
      )
    : [
        ...(initiator ? [initiator] : session.participants),
        { id: makeId("p"), nickname, role: "counterparty", userId: counterpartyUserId, confirmed: true, signatureDataUrl }
      ];

  return {
    ...session,
    participants,
    status: "active"
  };
}

export function settleBetSession(
  session: BetSession,
  winnerId: string
): BetSession {
  const winner = session.participants.find((participant) => participant.id === winnerId);
  const loser = session.participants.find((participant) => participant.id !== winnerId);

  if (!winner) {
    throw new Error("WINNER_NOT_IN_SESSION");
  }

  return {
    ...session,
    winnerId,
    loserId: loser?.id ?? null,
    status: "settling",
    settledAt: new Date().toISOString()
  };
}

export function getEffectiveStakeLabel(session: Pick<BetSession, "stake" | "boosts" | "participants">): string {
  const additions = session.stake.additions ?? [];
  const committedIds = new Set(additions.map((addition) => addition.boostId));
  const legacyConfirmed = session.boosts.filter(
    (boost) =>
      boost.confirmedBy.length >= session.participants.length &&
      !committedIds.has(boost.id)
  );
  const labels = [
    session.stake.label,
    ...additions.map((addition) => addition.label),
    ...legacyConfirmed.map((boost) => boost.label)
  ];
  return labels.filter(Boolean).join("；");
}

export function addBoost(session: BetSession, proposerId: string, label: string): BetSession {
  if (session.status !== "active") {
    throw new Error("BOOST_REQUIRES_ACTIVE_SESSION");
  }
  if (session.boosts.length >= 3) {
    throw new Error("BOOST_LIMIT_REACHED");
  }
  if (!session.participants.some((participant) => participant.id === proposerId)) {
    throw new Error("BOOST_PROPOSER_NOT_IN_SESSION");
  }

  const boost: Boost = {
    id: makeId("boost"),
    label: label.trim(),
    proposerId,
    confirmedBy: [proposerId],
    createdAt: new Date().toISOString()
  };

  if (!boost.label) {
    throw new Error("BOOST_LABEL_REQUIRED");
  }

  return {
    ...session,
    boosts: [...session.boosts, boost]
  };
}

export function confirmBoost(session: BetSession, boostId: string, participantId: string): BetSession {
  if (session.status !== "active") {
    throw new Error("BOOST_REQUIRES_ACTIVE_SESSION");
  }
  if (!session.participants.some((participant) => participant.id === participantId)) {
    throw new Error("BOOST_CONFIRMER_NOT_IN_SESSION");
  }

  const boost = session.boosts.find((candidate) => candidate.id === boostId);
  if (!boost) {
    throw new Error("BOOST_NOT_FOUND");
  }

  const nextBoosts = session.boosts.map((candidate) =>
    candidate.id === boostId && !candidate.confirmedBy.includes(participantId)
      ? { ...candidate, confirmedBy: [...candidate.confirmedBy, participantId] }
      : candidate
  );
  const existingAdditions = session.stake.additions ?? [];
  const existingAdditionIds = new Set(existingAdditions.map((addition) => addition.boostId));
  const newlyConfirmed = nextBoosts
    .filter(
      (candidate) =>
        candidate.confirmedBy.length >= session.participants.length &&
        !existingAdditionIds.has(candidate.id)
    )
    .map(
      (candidate): StakeAddition => ({
        boostId: candidate.id,
        label: candidate.label,
        createdAt: candidate.createdAt
      })
    );

  return {
    ...session,
    boosts: nextBoosts,
    stake:
      newlyConfirmed.length > 0
        ? {
            ...session.stake,
            additions: [...existingAdditions, ...newlyConfirmed]
          }
        : session.stake
  };
}
