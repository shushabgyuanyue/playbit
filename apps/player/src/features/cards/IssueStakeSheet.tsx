import { useEffect, useState } from "react";
import { playerCopy as copy } from "@playbit/content/player";
import type { BenefitIssuance, CouponSource, VoiceNote } from "../../data/types";
import { Icon } from "../../components/ui/Icon";
import { Sheet } from "../../components/ui/Sheet";
import { BenefitShareCard } from "../benefits/BenefitShareCard";
import { BenefitClaimLink } from "../benefits/BenefitClaimLink";
import { VoiceRecorderButton } from "../promise/VoiceRecorderButton";

type ShareIssuance = Pick<BenefitIssuance, "id" | "title" | "issuerName" | "voice" | "status" | "claimToken">;
export interface IssueShareLabels {
  title: string;
  eyebrow: string;
  description: string;
  issue: string;
  pending: string;
  voice: string;
  voiceHint: string;
  recordLabel: string;
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
  onIssue: (voice: VoiceNote) => void;
  onShare: () => void;
  onSelfClaim: () => void;
  submitting?: boolean;
  claiming?: boolean;
  labels?: Partial<IssueShareLabels>;
  source?: CouponSource;
  canSelfClaim?: boolean;
}) {
  const emptyVoice: VoiceNote = { id: "", durationMs: 0, storage: "demo" };
  const [recordedVoice, setRecordedVoice] = useState<VoiceNote>(emptyVoice);
  const [recording, setRecording] = useState(false);
  const text: IssueShareLabels = {
    title: copy.play.issueStakeTitle,
    eyebrow: "STAKE CARD",
    description: copy.play.issueStakeHint,
    issue: copy.play.issueStake,
    pending: copy.play.issueStakePending,
    voice: copy.play.issueStakeVoice,
    voiceHint: copy.play.issueStakeVoiceHint,
    recordLabel: copy.wallet.issueVoiceRecord,
    action: copy.play.issueStakeAction,
    signed: copy.play.issueStakeSigned,
    claimed: copy.play.issueStakeClaimed,
    share: copy.play.issueStakeShare,
    selfClaim: copy.play.issueStakeSelfClaim,
    ...labels
  };
  useEffect(() => {
    if (open && !issuance) {
      setRecordedVoice(voice ?? emptyVoice);
      setRecording(false);
    }
  }, [open, issuance]);

  const currentVoice = issuance?.voice ?? voice ?? recordedVoice;
  const audioBenefit = Boolean(currentVoice?.assetId);
  const unavailable = issuance?.status === "unavailable";

  return <Sheet open={open} onClose={onClose} title={text.title} eyebrow={text.eyebrow} description={audioBenefit ? copy.promise.voice.issueHint : text.description}>
    <div className="benefit-issue-content">
    <BenefitShareCard title={issuance?.title ?? currentVoice?.transcript?.trim() ?? stake} context={cardTitle} issuerName={issuance?.issuerName ?? issuerName} source={source} voice={currentVoice} active={open} status={unavailable ? copy.sharing.closed : issuance?.status === "claimed" ? text.claimed : issuance ? text.pending : text.issue} />
    {!issuance ? <>
      {!audioBenefit ? <div className="issue-voice-block">
        <div className="issue-voice-heading"><b>{text.voice}</b><small>{text.voiceHint}</small></div>
        <VoiceRecorderButton voice={recordedVoice} onChange={setRecordedVoice} onBusyChange={setRecording} label={text.voice} hint={text.voiceHint} recordLabel={text.recordLabel} compact />
      </div> : <p className="issue-stake-voice-hint">{copy.promise.voice.voiceSignature}</p>}
      <button className="primary-button issue-stake-submit" type="button" disabled={submitting || recording || !audioBenefit} onClick={() => onIssue(currentVoice)}>
        <Icon name="share" size={16} />{submitting ? copy.sharing.issuing : text.action}
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
    </div>
  </Sheet>;
}
