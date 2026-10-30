import { useEffect, useState } from "react";
import { playerCopy as copy } from "@playbit/content/player";
import type { BenefitIssuance, VoiceNote } from "../../data/types";
import { Icon } from "../../components/ui/Icon";
import { BenefitClaimLink } from "./BenefitClaimLink";
import { BenefitShareCard } from "./BenefitShareCard";
import { VoiceRecorderButton } from "../promise/VoiceRecorderButton";

const emptyVoice: VoiceNote = { id: "", durationMs: 0, storage: "demo" };

export function IssueBenefitSheet({
  open,
  onClose,
  issuerName,
  issuance,
  voice: initialVoice,
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
  voice?: VoiceNote;
  onIssue: (voice: VoiceNote) => void;
  onShare: () => void;
  onSelfClaim: () => void;
  submitting?: boolean;
  claiming?: boolean;
  canSelfClaim?: boolean;
}) {
  const [voice, setVoice] = useState<VoiceNote>(initialVoice ?? emptyVoice);
  const [recording, setRecording] = useState(false);
  useEffect(() => {
    if (open && !issuance) {
      setVoice(initialVoice ?? emptyVoice);
      setRecording(false);
    }
  }, [open, issuance, initialVoice]);
  const currentVoice = issuance?.voice ?? voice;
  const issuedSource = issuance?.source ?? "direct";

  if (!open) return null;
  return <section className="benefit-issue-inline" aria-label={copy.wallet.issueTitle}>
    <header className="benefit-issue-inline-head">
      <div><small>VOICE ISSUE</small><h2>{copy.wallet.issueTitle}</h2></div>
      <button className="icon-btn" type="button" onClick={onClose} disabled={submitting || recording || claiming} aria-label={copy.cancel} title={copy.cancel}><Icon name="close" size={16} /></button>
    </header>
    <p className="benefit-issue-inline-hint">{copy.wallet.issueHint}</p>
    <div className="benefit-issue-content">
    {!issuance ? <>
      <div className="issue-voice-block">
        <div className="issue-voice-heading"><div className="issue-voice-label"><b>{copy.wallet.issueVoice}</b><span className="issue-source-tag">{copy.wallet.issueSourceOptions.manual}</span></div><small>{copy.wallet.issueVoiceHint(issuerName)}</small></div>
        <VoiceRecorderButton voice={voice} onChange={setVoice} onBusyChange={setRecording} label={copy.wallet.issueVoice} hint={copy.wallet.issueVoiceHint(issuerName)} recordLabel={copy.wallet.issueVoiceRecord} compact />
      </div>
      <button className="primary-button issue-stake-submit" type="button" disabled={submitting || recording || !voice.assetId} onClick={() => onIssue(voice)}>
        <Icon name="share" size={16} />{submitting ? copy.sharing.issuing : copy.wallet.issueAction}
      </button>
    </> : <>
      <BenefitShareCard title={issuance.title} context={issuance.sourceNote ?? ""} issuerName={issuance.issuerName} source={issuedSource} voice={currentVoice} active={open} status={issuance.status === "unavailable" ? copy.sharing.closed : issuance.status === "claimed" ? copy.wallet.issueClaimed : copy.wallet.issuePending} />
      {issuance.status === "pending_claim" && <><BenefitClaimLink token={issuance.claimToken} />
      <div className="issue-stake-actions">
        <button className="primary-button" type="button" onClick={onShare} disabled={claiming}><Icon name="send" size={17} />{copy.wallet.issueShare}</button>
        {canSelfClaim && <button className="text-button" type="button" disabled={claiming} onClick={onSelfClaim}>{claiming ? copy.sharing.claiming : copy.wallet.issueSelfClaim}</button>}
      </div></>}
    </>}
    </div>
  </section>;
}
