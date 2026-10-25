import { useEffect, useState } from "react";
import { playerCopy as copy } from "@playbit/content/player";
import type { BenefitIssuance, Signature } from "../../data/types";
import { Icon } from "../../components/ui/Icon";
import { Sheet } from "../../components/ui/Sheet";
import { SignaturePad } from "../promise/SignaturePad";

type ShareIssuance = Pick<BenefitIssuance, "id" | "title" | "issuerName" | "signature" | "status">;
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
  onIssue,
  onShare,
  onSelfClaim,
  labels,
  canSelfClaim = true
}: {
  open: boolean;
  onClose: () => void;
  cardTitle: string;
  stake: string;
  issuerName: string;
  issuance: ShareIssuance | null;
  onIssue: (signature: Signature) => void;
  onShare: () => void;
  onSelfClaim: () => void;
  labels?: Partial<IssueShareLabels>;
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

  return <Sheet open={open} onClose={onClose} title={text.title} eyebrow={text.eyebrow} description={text.description}>
    <div className="issue-stake-context">
      <span>{cardTitle}</span>
      <strong>{stake}</strong>
      <small>{issuerName} · {issuance ? text.pending : text.issue}</small>
    </div>
    {!issuance ? <>
      <SignaturePad label={text.sign} value={signature} onChange={setSignature} />
      <p className="issue-stake-sign-hint">{text.signHint}</p>
      <button className="primary-button issue-stake-submit" type="button" disabled={!signature.length} onClick={() => onIssue(signature)}>
        <Icon name="sign" size={17} />{text.action}
      </button>
    </> : <>
      <div className="issue-stake-issued" role="status">
        <Icon name="check" size={17} />
        <span><b>{issuance.status === "claimed" ? text.claimed : text.signed}</b><small>{issuance.status === "claimed" ? "这份权益已进入权益中心" : text.pending}</small></span>
      </div>
      {issuance.status !== "claimed" && <div className="issue-stake-actions">
        <button className="primary-button" type="button" onClick={onShare}><Icon name="send" size={17} />{text.share}</button>
        {canSelfClaim && <button className="text-button" type="button" onClick={onSelfClaim}>{text.selfClaim}</button>}
      </div>}
    </>}
  </Sheet>;
}
