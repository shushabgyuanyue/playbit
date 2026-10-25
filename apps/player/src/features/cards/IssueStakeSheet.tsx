import { useEffect, useState } from "react";
import { playerCopy as copy } from "@playbit/content/player";
import type { GameStakeIssuance, Signature } from "../../data/types";
import { Icon } from "../../components/ui/Icon";
import { Sheet } from "../../components/ui/Sheet";
import { SignaturePad } from "../promise/SignaturePad";

export function IssueStakeSheet({
  open,
  onClose,
  cardTitle,
  stake,
  issuerName,
  issuance,
  onIssue,
  onShare,
  onSelfClaim
}: {
  open: boolean;
  onClose: () => void;
  cardTitle: string;
  stake: string;
  issuerName: string;
  issuance: GameStakeIssuance | null;
  onIssue: (signature: Signature) => void;
  onShare: () => void;
  onSelfClaim: () => void;
}) {
  const [signature, setSignature] = useState<Signature>([]);
  useEffect(() => {
    if (open && !issuance) setSignature([]);
  }, [open, issuance]);

  return <Sheet open={open} onClose={onClose} title={copy.play.issueStakeTitle} eyebrow="STAKE CARD" description={copy.play.issueStakeHint}>
    <div className="issue-stake-context">
      <span>{cardTitle}</span>
      <strong>{stake}</strong>
      <small>{issuerName} · {issuance ? copy.play.issueStakePending : copy.play.issueStake}</small>
    </div>
    {!issuance ? <>
      <SignaturePad label={copy.play.issueStakeSign} value={signature} onChange={setSignature} />
      <p className="issue-stake-sign-hint">{copy.play.issueStakeSignHint}</p>
      <button className="primary-button issue-stake-submit" type="button" disabled={!signature.length} onClick={() => onIssue(signature)}>
        <Icon name="sign" size={17} />{copy.play.issueStakeAction}
      </button>
    </> : <>
      <div className="issue-stake-issued" role="status">
        <Icon name="check" size={17} />
        <span><b>{copy.play.issueStakeSigned}</b><small>{copy.play.issueStakePending}</small></span>
      </div>
      <div className="issue-stake-actions">
        <button className="primary-button" type="button" onClick={onShare}><Icon name="send" size={17} />{copy.play.issueStakeShare}</button>
        <button className="text-button" type="button" onClick={onSelfClaim}>{copy.play.issueStakeSelfClaim}</button>
      </div>
    </>}
  </Sheet>;
}
