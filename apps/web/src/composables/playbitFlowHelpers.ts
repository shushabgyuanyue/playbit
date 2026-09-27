import { copy } from "@playbit/content";
import type { Agreement, Flip, Stake } from "@playbit/shared";
import { getEffectiveStakeLabel } from "../utils/sessionDisplay";
import { publicInvitationUrl } from "../services/publicSite";

export type SharePayload = {
  title: string;
  text: string;
  url: string;
};

export type ShareIntent = "sign" | "flip" | "game" | "general";

export function buildFlipSharePayload(flip: Flip): SharePayload {
  const url = publicInvitationUrl("flip", flip.id);
  return { title: copy.flip.navTitle, text: copy.flip.shareText, url: url.toString() };
}

export const defaultStake: Stake = {
  type: "coupon",
  label: copy.stakes.presets[0].label,
  fulfilled: false,
  additions: []
};

export function buildSharePayload(agreement: Agreement): SharePayload {
  if (agreement.source === "card") {
    const url = publicInvitationUrl("game", agreement.shareCode);
    return { title: agreement.title, text: `${copy.game.joinedBy(agreement.participants[0]?.nickname ?? '')}\n${agreement.title}\n${copy.game.stakeTitle}：${getEffectiveStakeLabel(agreement)}`, url: url.toString() };
  }
  const winner = agreement.participants.find((participant) => participant.id === agreement.winnerId)?.nickname;
  const url = publicInvitationUrl("share", agreement.shareCode).toString();
  const text = winner
    ? `《${copy.share.settlementTitle}》\n${copy.share.labels.agreement}：${agreement.title}\n${copy.share.labels.winner}：${winner}\n${copy.share.labels.stake}：${getEffectiveStakeLabel(agreement)}`
    : `《${agreement.title}》${copy.share.labels.pending}\n${copy.share.labels.challenge}：${agreement.challenge}\n${copy.share.labels.stake}：${getEffectiveStakeLabel(agreement)}\n${copy.share.labels.signLink}：${url}`;

  return {
    title: agreement.winnerId ? copy.share.settlementTitle : agreement.title,
    text,
    url
  };
}
