import { copy } from "@playbit/content";
import type { BetSession, Participant, SessionStatus } from "@playbit/shared";

export function getParticipantName(session: BetSession, role: Participant["role"], fallback: string) {
  return session.participants.find((participant) => participant.role === role)?.nickname ?? fallback;
}

export function getWinnerName(session: BetSession, fallback = copy.common.pending) {
  return session.participants.find((participant) => participant.id === session.winnerId)?.nickname ?? fallback;
}

export function getLoserName(session: BetSession, fallback = copy.common.pending) {
  return session.participants.find((participant) => participant.id === session.loserId)?.nickname ?? fallback;
}

export function getCounterpartyName(session: BetSession, fallback = copy.contract.fallbackCounterparty) {
  return getParticipantName(session, "counterparty", fallback);
}

export function getEffectiveStakeLabel(session: Pick<BetSession, "stake">) {
  return [session.stake.label, ...(session.stake.additions ?? []).map((addition) => addition.label)]
    .filter(Boolean)
    .join("；");
}

export function isCounterpartySigned(session: BetSession) {
  return session.participants.some((participant) => participant.role === "counterparty" && participant.confirmed);
}

export function getSessionStatusLabel(status: SessionStatus) {
  return copy.session.statuses[status];
}

export function getSessionStatusTone(status: SessionStatus) {
  if (status === "fulfilled" || status === "finished") {
    return "archive";
  }
  if (status === "settling") {
    return "pending";
  }
  if (status === "active") {
    return "success";
  }
  return "contract";
}
