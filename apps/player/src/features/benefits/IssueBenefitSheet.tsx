import { useEffect, useState } from "react";
import { playerCopy as copy } from "@playbit/content/player";
import type { BenefitIssuance, CouponSource, Signature } from "../../data/types";
import { Icon } from "../../components/ui/Icon";
import { Sheet } from "../../components/ui/Sheet";
import { SignaturePad } from "../promise/SignaturePad";
import { BenefitClaimLink } from "./BenefitClaimLink";

export function IssueBenefitSheet({
  open,
  onClose,
  issuerName,
  issuance,
  onIssue,
  onShare,
  onSelfClaim,
  submitting = false,
  claiming = false,
  canSelfClaim = true
}: {
  open: boolean;
  onClose: () => void;
  issuerName: string;
  issuance: BenefitIssuance | null;
  onIssue: (title: string, source: CouponSource, sourceNote: string, signature: Signature) => void;
  onShare: () => void;
  onSelfClaim: () => void;
  submitting?: boolean;
  claiming?: boolean;
  canSelfClaim?: boolean;
}) {
  const [title, setTitle] = useState("");
  const [sourceMode, setSourceMode] = useState<"manual" | "game" | "promise" | "custom">("manual");
  const [customSource, setCustomSource] = useState("");
  const [sourceEditing, setSourceEditing] = useState(false);
  const [signature, setSignature] = useState<Signature>([]);
  const [custom, setCustom] = useState("");
  useEffect(() => {
    if (open && !issuance) {
      setTitle("");
      setSourceMode("manual");
      setCustomSource("");
      setSourceEditing(false);
      setCustom("");
      setSignature([]);
    }
  }, [open, issuance]);
  const selected = copy.promise.options.includes(title as (typeof copy.promise.options)[number]);
  const value = selected ? title : custom;
  const sourceLabel = sourceMode === "manual" ? copy.wallet.issueSourceOptions.manual : sourceMode === "game" ? copy.wallet.issueSourceOptions.game : sourceMode === "promise" ? copy.wallet.issueSourceOptions.promise : customSource.trim() || copy.wallet.issueSourceOptions.custom;
  const source: CouponSource = sourceMode === "game" ? "game" : sourceMode === "promise" ? "promise" : "direct";
  const sourceNote = sourceMode === "manual" ? copy.wallet.issueSourceOptions.manual : sourceMode === "game" ? copy.wallet.issueSourceOptions.game : sourceMode === "promise" ? copy.wallet.issueSourceOptions.promise : customSource.trim() || copy.wallet.issueSourceOptions.manual;
  function choose(option: string) {
    setTitle(option);
    setCustom("");
  }
  function changeCustom(next: string) {
    setCustom(next);
    setTitle(next);
  }
  function chooseSource(next: typeof sourceMode) {
    setSourceMode(next);
    if (next !== "custom") setSourceEditing(false);
  }

  return <Sheet open={open} onClose={onClose} title={copy.wallet.issueTitle} eyebrow="MANUAL ISSUE" description={copy.wallet.issueHint}>
    {!issuance ? <>
      <div className="benefit-picker issue-benefit-picker">
        <span>{copy.wallet.issueContent}</span>
        <div>{copy.promise.options.map(option => <button type="button" className={selected && title === option ? "selected" : ""} aria-pressed={title === option} onClick={() => choose(option)} key={option}>{option}</button>)}</div>
        <label><Icon name="spark" size={15} /><input aria-label={copy.promise.custom} value={selected ? "" : custom} onChange={event => changeCustom(event.target.value)} placeholder={copy.promise.custom} maxLength={80} /></label>
      </div>
      <div className="issue-source-field">
        <div className="issue-source-summary">
          <span>{copy.wallet.issueSource}</span>
          <strong>{sourceLabel}</strong>
          <button className="issue-source-edit" type="button" onClick={() => setSourceEditing(value => !value)} aria-label={copy.wallet.issueSourceEdit} aria-expanded={sourceEditing}><Icon name="edit" size={13} /></button>
        </div>
        {sourceEditing && <div className="issue-source-editor" role="group" aria-label={copy.wallet.issueSource}>
          {(["manual", "game", "promise", "custom"] as const).map(option => <button key={option} type="button" className={sourceMode === option ? "selected" : ""} onClick={() => chooseSource(option)}>{copy.wallet.issueSourceOptions[option]}</button>)}
          {sourceMode === "custom" && <input value={customSource} onChange={event => setCustomSource(event.target.value)} placeholder={copy.wallet.issueSourcePlaceholder} maxLength={80} />}
        </div>}
      </div>
      <SignaturePad label={copy.wallet.issueSign} value={signature} onChange={setSignature} />
      <p className="issue-benefit-sign-hint">{copy.wallet.issueSignHint(issuerName)}</p>
      <button className="primary-button issue-stake-submit" type="button" disabled={submitting || !value.trim() || !signature.length} onClick={() => onIssue(value, source, sourceNote, signature)}>
        <Icon name="sign" size={17} />{submitting ? copy.sharing.issuing : copy.wallet.issueAction}
      </button>
    </> : <>
      <div className={`issue-pending-ticket ${issuance.source === "promise" ? "dark-coupon" : issuance.source === "game" ? "coral-coupon" : "debt-ticket"}`} role="status">
        <div className="issue-pending-ticket-body">
          <small>{issuance.status === "unavailable" ? copy.sharing.closed : issuance.status === "claimed" ? copy.wallet.issueClaimed : copy.wallet.issueIssuedLabel}</small>
          <strong>{issuance.title}</strong>
          <span>{issuance.issuerName} · {issuance.status === "unavailable" ? copy.sharing.closed : issuance.status === "claimed" ? copy.wallet.issueClaimed : copy.wallet.issuePending}</span>
        </div>
        <div className="issue-pending-ticket-mark"><Icon name="send" size={14} />{sourceLabel}</div>
      </div>
      {issuance.status === "pending_claim" && <><BenefitClaimLink token={issuance.claimToken} />
      <div className="issue-stake-actions">
        <button className="primary-button" type="button" onClick={onShare} disabled={claiming}><Icon name="send" size={17} />{copy.wallet.issueShare}</button>
        {canSelfClaim && <button className="text-button" type="button" disabled={claiming} onClick={onSelfClaim}>{claiming ? copy.sharing.claiming : copy.wallet.issueSelfClaim}</button>}
      </div></>}
    </>}
  </Sheet>;
}
