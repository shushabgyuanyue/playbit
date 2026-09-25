import type { Agreement, Boost, Card, Coupon, CreateAgreementInput, Flip, Participant, StakeAddition } from "@playbit/shared";

function makeId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createAgreement(input: CreateAgreementInput, creatorUserId: string): Agreement {
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
    stake: input.stake,
    cardId: input.cardId ?? null,
    status: "pending_signature",
    winnerId: null,
    loserId: null,
    resultRecorderUserId: null,
    fulfillmentRecorderUserId: null,
    boosts: [],
    revision: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    resultRecordedAt: null,
    shareCode: makeId("share")
  };
}

export function signCounterparty(
  agreement: Agreement,
  nickname: string,
  counterpartyUserId: string | null = null,
  signatureDataUrl: string | null = null
): Agreement {
  const initiator = agreement.participants.find((participant) => participant.role === "initiator");
  const counterparty = agreement.participants.find((participant) => participant.role === "counterparty");
  const participants: Participant[] = counterparty
    ? agreement.participants.map((participant) =>
        participant.role === "counterparty"
          ? { ...participant, nickname, userId: counterpartyUserId, confirmed: true, signatureDataUrl }
          : participant
      )
    : [
        ...(initiator ? [initiator] : agreement.participants),
        { id: makeId("p"), nickname, role: "counterparty", userId: counterpartyUserId, confirmed: true, signatureDataUrl }
      ];

  return {
    ...agreement,
    participants,
    status: "active"
  };
}

export function recordAgreementResult(
  agreement: Agreement,
  winnerId: string,
  recorderUserId: string
): Agreement {
  const winner = agreement.participants.find((participant) => participant.id === winnerId);
  const loser = agreement.participants.find((participant) => participant.id !== winnerId);
  const recorder = agreement.participants.find((participant) => participant.userId === recorderUserId);

  if (!winner || !recorder) {
    throw new Error("WINNER_NOT_IN_AGREEMENT");
  }

  return {
    ...agreement,
    winnerId,
    loserId: loser?.id ?? null,
    resultRecorderUserId: recorderUserId,
    status: "result_recorded",
    resultRecordedAt: new Date().toISOString()
  };
}

export function getEffectiveStakeLabel(agreement: Pick<Agreement, "stake">): string {
  const additions = agreement.stake.additions ?? [];
  const labels = [
    agreement.stake.label,
    ...additions.map((addition) => addition.label)
  ];
  return labels.filter(Boolean).join("；");
}

export function addBoost(agreement: Agreement, proposerId: string, label: string): Agreement {
  if (agreement.status !== "active") {
    throw new Error("BOOST_REQUIRES_ACTIVE_AGREEMENT");
  }
  if (agreement.boosts.length >= 3) {
    throw new Error("BOOST_LIMIT_REACHED");
  }
  if (!agreement.participants.some((participant) => participant.id === proposerId)) {
    throw new Error("BOOST_PROPOSER_NOT_IN_AGREEMENT");
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
    ...agreement,
    boosts: [...agreement.boosts, boost]
  };
}

export function confirmBoost(agreement: Agreement, boostId: string, participantId: string): Agreement {
  if (agreement.status !== "active") {
    throw new Error("BOOST_REQUIRES_ACTIVE_AGREEMENT");
  }
  if (!agreement.participants.some((participant) => participant.id === participantId)) {
    throw new Error("BOOST_CONFIRMER_NOT_IN_AGREEMENT");
  }

  const boost = agreement.boosts.find((candidate) => candidate.id === boostId);
  if (!boost) {
    throw new Error("BOOST_NOT_FOUND");
  }

  const nextBoosts = agreement.boosts.map((candidate) =>
    candidate.id === boostId && !candidate.confirmedBy.includes(participantId)
      ? { ...candidate, confirmedBy: [...candidate.confirmedBy, participantId] }
      : candidate
  );
  const existingAdditions = agreement.stake.additions ?? [];
  const existingAdditionIds = new Set(existingAdditions.map((addition) => addition.boostId));
  const newlyConfirmed = nextBoosts
    .filter(
      (candidate) =>
        candidate.confirmedBy.length >= agreement.participants.length &&
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
    ...agreement,
    boosts: nextBoosts,
    stake:
      newlyConfirmed.length > 0
        ? {
            ...agreement.stake,
            additions: [...existingAdditions, ...newlyConfirmed]
          }
        : agreement.stake
  };
}

export function beginFlip(
  agreement: Agreement,
  coupon: Coupon,
  card: Card,
  applicantUserId: string,
  hasOpenFlip: boolean
): Flip {
  if (card.mode !== "versus") {
    throw new Error("FLIP_REQUIRES_VERSUS_CARD");
  }
  if (!agreement.winnerId || !agreement.loserId || coupon.status !== "available") {
    throw new Error("FLIP_REQUIRES_AVAILABLE_EQUITY");
  }
  if (coupon.agreementId !== agreement.id || coupon.issuerUserId !== applicantUserId) {
    throw new Error("FLIP_APPLICANT_NOT_EQUITY_PROVIDER");
  }
  if (!coupon.holderUserId || coupon.holderUserId === applicantUserId) {
    throw new Error("FLIP_REQUIRES_TWO_PARTICIPANTS");
  }
  if (hasOpenFlip) {
    throw new Error("FLIP_ALREADY_OPEN");
  }

  return {
    id: makeId("flip"),
    agreementId: agreement.id,
    couponId: coupon.id,
    applicantUserId,
    inviteeUserId: coupon.holderUserId,
    card,
    status: "pending_acceptance",
    winnerUserId: null,
    resultRecorderUserId: null,
    outcome: null,
    createdAt: new Date().toISOString(),
    resolvedAt: null
  };
}

export function respondToFlip(flip: Flip, userId: string, accept: boolean): Flip {
  if (flip.status !== "pending_acceptance") {
    throw new Error("FLIP_NOT_AWAITING_RESPONSE");
  }
  if (flip.inviteeUserId !== userId) {
    throw new Error("FLIP_RESPONSE_FORBIDDEN");
  }
  return { ...flip, status: accept ? "active" : "declined" };
}

export function recordFlipResult(flip: Flip, winnerUserId: string, recorderUserId: string): Flip {
  if (flip.status !== "active") {
    throw new Error("FLIP_NOT_ACTIVE");
  }
  if (![flip.applicantUserId, flip.inviteeUserId].includes(recorderUserId)) {
    throw new Error("FLIP_RESULT_RECORDER_FORBIDDEN");
  }
  if (![flip.applicantUserId, flip.inviteeUserId].includes(winnerUserId)) {
    throw new Error("FLIP_WINNER_NOT_PARTICIPANT");
  }

  const applicantWon = winnerUserId === flip.applicantUserId;
  return {
    ...flip,
    status: "settled",
    winnerUserId,
    resultRecorderUserId: recorderUserId,
    outcome: applicantWon ? "applicant_won" : "applicant_lost",
    resolvedAt: new Date().toISOString()
  };
}
