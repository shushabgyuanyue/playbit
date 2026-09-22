import { copy } from "@playbit/content";
import type { BetSession, Stake } from "@playbit/shared";

export type SharePayload = {
  title: string;
  text: string;
  url: string;
};

export const defaultStake: Stake = {
  type: "coupon",
  label: copy.stakes.presets[0].label,
  fulfilled: false
};

export function buildSharePayload(session: BetSession): SharePayload {
  const winner = session.participants.find((participant) => participant.id === session.winnerId)?.nickname;
  const url = `${window.location.origin}${window.location.pathname}?share=${session.shareCode}`;
  const text = winner
    ? `《${copy.share.settlementTitle}》\n${copy.share.labels.agreement}：${session.title}\n${copy.share.labels.winner}：${winner}\n${copy.share.labels.stake}：${session.stake.label}`
    : `《${session.title}》${copy.share.labels.pending}\n${copy.share.labels.challenge}：${session.challenge}\n${copy.share.labels.judgment}：${session.judgmentRule}\n${copy.share.labels.stake}：${session.stake.label}\n${copy.share.labels.signLink}：${url}`;

  return {
    title: session.winnerId ? copy.share.settlementTitle : session.title,
    text,
    url
  };
}

export function persistSessions(sessions: BetSession[]) {
  localStorage.setItem("playbit.sessions", JSON.stringify(sessions));
}

export function loadLocalSessions(): BetSession[] {
  const stored = localStorage.getItem("playbit.sessions");
  return stored ? (JSON.parse(stored) as BetSession[]) : [];
}
