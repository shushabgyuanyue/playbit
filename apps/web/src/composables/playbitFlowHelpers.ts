import { copy } from "@playbit/content";
import type { Agreement, Stake } from "@playbit/shared";
import { getEffectiveStakeLabel } from "../utils/sessionDisplay";

export type SharePayload = {
  title: string;
  text: string;
  url: string;
};

export const defaultStake: Stake = {
  type: "coupon",
  label: copy.stakes.presets[0].label,
  fulfilled: false,
  additions: []
};

export function buildSharePayload(agreement: Agreement): SharePayload {
  const winner = agreement.participants.find((participant) => participant.id === agreement.winnerId)?.nickname;
  const url = `${window.location.origin}${window.location.pathname}?share=${agreement.shareCode}`;
  const text = winner
    ? `《${copy.share.settlementTitle}》\n${copy.share.labels.agreement}：${agreement.title}\n${copy.share.labels.winner}：${winner}\n${copy.share.labels.stake}：${getEffectiveStakeLabel(agreement)}`
    : `《${agreement.title}》${copy.share.labels.pending}\n${copy.share.labels.challenge}：${agreement.challenge}\n${copy.share.labels.stake}：${getEffectiveStakeLabel(agreement)}\n${copy.share.labels.signLink}：${url}`;

  return {
    title: agreement.winnerId ? copy.share.settlementTitle : agreement.title,
    text,
    url
  };
}
