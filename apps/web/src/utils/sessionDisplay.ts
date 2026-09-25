import { copy } from "@playbit/content";
import type { Agreement, Participant, AgreementStatus } from "@playbit/shared";

export function getParticipantName(agreement: Agreement, role: Participant["role"], fallback: string) {
  return agreement.participants.find((participant) => participant.role === role)?.nickname ?? fallback;
}

export function getWinnerName(agreement: Agreement, fallback = copy.common.pending) {
  return agreement.participants.find((participant) => participant.id === agreement.winnerId)?.nickname ?? fallback;
}

export function getLoserName(agreement: Agreement, fallback = copy.common.pending) {
  return agreement.participants.find((participant) => participant.id === agreement.loserId)?.nickname ?? fallback;
}

export function getCounterpartyName(agreement: Agreement, fallback = copy.contract.fallbackCounterparty) {
  return getParticipantName(agreement, "counterparty", fallback);
}

export function getEffectiveStakeLabel(agreement: Pick<Agreement, "stake">) {
  return [agreement.stake.label, ...(agreement.stake.additions ?? []).map((addition) => addition.label)]
    .filter(Boolean)
    .join("；");
}

export function isCounterpartySigned(agreement: Agreement) {
  return agreement.participants.some((participant) => participant.role === "counterparty" && participant.confirmed);
}

export function getAgreementStatusLabel(status: AgreementStatus) {
  return copy.session.statuses[status];
}

export function getAgreementStatusTone(status: AgreementStatus) {
  if (status === "fulfilled") {
    return "archive";
  }
  if (status === "result_recorded") {
    return "pending";
  }
  if (status === "active") {
    return "success";
  }
  return "contract";
}
