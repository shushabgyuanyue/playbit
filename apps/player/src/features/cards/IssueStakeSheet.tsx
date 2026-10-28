import { useEffect, useState } from "react";
import { playerCopy as copy } from "@playbit/content/player";
import type { BenefitIssuance, CouponSource, Signature, VoiceNote } from "../../data/types";
import { Icon } from "../../components/ui/Icon";
import { Sheet } from "../../components/ui/Sheet";
import { SignaturePad } from "../promise/SignaturePad";
import { BenefitShareCard } from "../benefits/BenefitShareCard";
import { BenefitClaimLink } from "../benefits/BenefitClaimLink";

type ShareIssuance = Pick<BenefitIssuance, "id" | "title" | "issuerName" | "signature" | "status" | "claimToken">;
export interface IssueShareLabels {
  title: string;
  eyebrow: string;
  description: string;
  issue: string;
  pending: string;
  sign: string;
  signHint: string;
  action: string;
  signed: string;
  claimed: string;
  share: string;
  selfClaim: string;
}

export function IssueStakeSheet({
  open,
  onClose,
  cardTitle,
  stake,
  issuerName,
  issuance,
  voice,
  onIssue,
  onShare,
  onSelfClaim,
  submitting = false,
  claiming = false,
  labels,
  source = "game",
  canSelfClaim = true
}: {
  open: boolean;
  onClose: () => void;
  cardTitle: string;
  stake: string;
  issuerName: string;
  issuance: ShareIssuance | null;
  voice?: VoiceNote;
  onIssue: (signature: Signature) => void;
  onShare: () => void;
  onSelfClaim: () => void;
  submitting?: boolean;
  claiming?: boolean;
  labels?: Partial<IssueShareLabels>;
  source?: CouponSource;
  canSelfClaim?: boolean;
}) {
  const [signature, setSignature] = useState<Signature>([]);
  const text: IssueShareLabels = {
    title: copy.play.issueStakeTitle,
    eyebrow: "STAKE CARD",
    description: copy.play.issueStakeHint,
    issue: copy.play.issueStake,
    pending: copy.play.issueStakePending,
    sign: copy.play.issueStakeSign,
    signHint: copy.play.issueStakeSignHint,
    action: copy.play.issueStakeAction,
    signed: copy.play.issueStakeSigned,
    claimed: copy.play.issueStakeClaimed,
    share: copy.play.issueStakeShare,
    selfClaim: copy.play.issueStakeSelfClaim,
    ...labels
  };
  useEffect(() => {
    if (open && !issuance) setSignature([]);
  }, [open, issuance]);

  const audioBenefit = Boolean(voice?.assetId);
  const unavailable = issuance?.status === "unavailable";

  return <Sheet open={open} onClose={onClose} title={text.title} eyebrow={text.eyebrow} description={audioBenefit ? copy.promise.voice.issueHint : text.description}>
    <BenefitShareCard title={issuance?.title ?? stake} context={cardTitle} issuerName={issuance?.issuerName ?? issuerName} source={source} voice={voice} active={open} status={unavailable ? copy.sharing.closed : issuance?.status === "claimed" ? text.claimed : issuance ? text.pending : text.issue} />
    {audioBenefit && <p className="issue-stake-sign-hint">{copy.promise.voice.localShareHint}</p>}
    {!issuance ? <>
      {!audioBenefit && <><SignaturePad label={text.sign} value={signature} onChange={setSignature} /><p className="issue-stake-sign-hint">{text.signHint}</p></>}
      <button className="primary-button issue-stake-submit" type="button" disabled={submitting || (!audioBenefit && !signature.length)} onClick={() => onIssue(signature)}>
        <Icon name="share" size={17} />{submitting ? copy.sharing.issuing : text.action}
      </button>
    </> : <>
      <div className="issue-stake-issued" role="status">
        <Icon name="check" size={17} />
        <span><b>{unavailable ? copy.sharing.closed : issuance.status === "claimed" ? text.claimed : text.signed}</b><small>{unavailable ? copy.wallet.claimUnavailable : issuance.status === "claimed" ? "这份权益已进入权益中心" : text.pending}</small></span>
      </div>
      {issuance.status === "pending_claim" && <><BenefitClaimLink token={issuance.claimToken} /><div className="issue-stake-actions">
        <button className="primary-button" type="button" disabled={claiming} onClick={onShare}><Icon name="share" size={17} />{text.share}</button>
        {canSelfClaim && <button className="text-button" type="button" disabled={claiming} onClick={onSelfClaim}>{claiming ? copy.sharing.claiming : text.selfClaim}</button>}
      </div></>}
    </>}
  </Sheet>;
}
