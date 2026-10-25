import { useEffect, useState } from "react";
import { playerCopy as copy } from "@playbit/content/player";
import type { BenefitIssuance, Signature } from "../../data/types";
import { Icon } from "../../components/ui/Icon";
import { Sheet } from "../../components/ui/Sheet";
import { SignaturePad } from "../promise/SignaturePad";

export function IssueBenefitSheet({
  open,
  onClose,
  issuerName,
  issuance,
  onIssue,
  onShare,
  onSelfClaim
}: {
  open: boolean;
  onClose: () => void;
  issuerName: string;
  issuance: BenefitIssuance | null;
  onIssue: (title: string, sourceNote: string, signature: Signature) => void;
  onShare: () => void;
  onSelfClaim: () => void;
}) {
  const [title, setTitle] = useState("");
  const [sourceMode, setSourceMode] = useState<"manual" | "game" | "promise" | "custom">("manual");
  const [customSource, setCustomSource] = useState("");
  const [signature, setSignature] = useState<Signature>([]);
  const [custom, setCustom] = useState("");
  useEffect(() => {
    if (open && !issuance) {
      setTitle("");
      setSourceMode("manual");
      setCustomSource("");
      setCustom("");
      setSignature([]);
    }
  }, [open, issuance]);
  const selected = copy.promise.options.includes(title as (typeof copy.promise.options)[number]);
  const value = selected ? title : custom;
  const sourceNote = sourceMode === "manual" ? copy.wallet.issueSourceOptions.manual : sourceMode === "game" ? copy.wallet.issueSourceOptions.game : sourceMode === "promise" ? copy.wallet.issueSourceOptions.promise : customSource.trim() || copy.wallet.issueSourceOptions.manual;
  function choose(option: string) {
    setTitle(option);
    setCustom("");
  }
  function changeCustom(next: string) {
    setCustom(next);
    setTitle(next);
  }

  return <Sheet open={open} onClose={onClose} title={copy.wallet.issueTitle} eyebrow="MANUAL ISSUE" description={copy.wallet.issueHint}>
    {!issuance ? <>
      <div className="benefit-picker issue-benefit-picker">
        <span>{copy.wallet.issueContent}</span>
        <div>{copy.promise.options.map(option => <button type="button" className={selected && title === option ? "selected" : ""} aria-pressed={title === option} onClick={() => choose(option)} key={option}>{option}</button>)}</div>
        <label><Icon name="spark" size={15} /><input aria-label={copy.promise.custom} value={selected ? "" : custom} onChange={event => changeCustom(event.target.value)} placeholder={copy.promise.custom} maxLength={80} /></label>
      </div>
      <label className="issue-source-field"><span>{copy.wallet.issueSource}</span><select value={sourceMode} onChange={event => setSourceMode(event.target.value as typeof sourceMode)}><option value="manual">{copy.wallet.issueSourceOptions.manual}</option><option value="game">{copy.wallet.issueSourceOptions.game}</option><option value="promise">{copy.wallet.issueSourceOptions.promise}</option><option value="custom">{copy.wallet.issueSourceOptions.custom}</option></select>{sourceMode === "custom" && <input value={customSource} onChange={event => setCustomSource(event.target.value)} placeholder={copy.wallet.issueSourcePlaceholder} maxLength={80} />}</label>
      <SignaturePad label={copy.wallet.issueSign} value={signature} onChange={setSignature} />
      <p className="issue-benefit-sign-hint">{copy.wallet.issueSignHint(issuerName)}</p>
      <button className="primary-button issue-stake-submit" type="button" disabled={!value.trim() || !signature.length} onClick={() => onIssue(value, sourceNote, signature)}>
        <Icon name="sign" size={17} />{copy.wallet.issueAction}
      </button>
    </> : <>
      <div className="issue-stake-context">
        <span>{copy.wallet.issueIssuedLabel}</span>
        <strong>{issuance.title}</strong>
        <small>{issuance.issuerName} · {copy.wallet.issuePending}</small>
      </div>
      <div className="issue-stake-issued" role="status">
        <Icon name="check" size={17} />
        <span><b>{copy.wallet.issueCreated}</b><small>{copy.wallet.issuePending}</small></span>
      </div>
      <div className="issue-stake-actions">
        <button className="primary-button" type="button" onClick={onShare}><Icon name="send" size={17} />{copy.wallet.issueShare}</button>
        <button className="text-button" type="button" onClick={onSelfClaim}>{copy.wallet.issueSelfClaim}</button>
      </div>
    </>}
  </Sheet>;
}
