import { useId, type KeyboardEvent } from "react";
import { playerCopy as copy } from "@playbit/content/player";
import { Icon } from "../../components/ui/Icon";
import type { PromiseDraft, VoiceNote } from "../../data/types";
import { VoiceRecorderButton } from "./VoiceRecorderButton";

type VoiceKind = "challenge" | "benefit";

export function VoiceAgreementEditor({ draft, active, recording, onRecordingChange, onActiveChange, onVoiceChange }: {
  draft: PromiseDraft;
  active: VoiceKind;
  recording: boolean;
  onRecordingChange: (busy: boolean) => void;
  onActiveChange: (kind: VoiceKind) => void;
  onVoiceChange: (kind: VoiceKind, voice: VoiceNote) => void;
}) {
  const id = useId();
  const labels = copy.promise.voice;
  const isChallenge = active === "challenge";
  const voice = isChallenge ? draft.challengeVoice : draft.benefitVoice;
  const title = isChallenge ? labels.challengeLabel : labels.benefitLabel;

  function navigateTabs(event: KeyboardEvent<HTMLButtonElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === "Home" ? "challenge" : event.key === "End" ? "benefit" : isChallenge ? "benefit" : "challenge";
    onActiveChange(next);
    event.currentTarget.parentElement?.querySelector<HTMLButtonElement>(`[data-kind="${next}"]`)?.focus();
  }

  return <section className="agreement-editor" aria-label={labels.creationTitle}>
    <header className="agreement-edit-header"><h2>{labels.creationTitle}</h2><p>{labels.creationNote}</p></header>
    <div className="agreement-voice-tabs" role="tablist" aria-label={labels.creationTitle}>
      {(["challenge", "benefit"] as const).map((kind, index) => {
        const recorded = Boolean((kind === "challenge" ? draft.challengeVoice : draft.benefitVoice).assetId);
        return <button key={kind} id={`${id}-${kind}`} data-kind={kind} type="button" role="tab" disabled={recording} aria-selected={active === kind} aria-controls={`${id}-panel`} tabIndex={active === kind ? 0 : -1} onClick={() => onActiveChange(kind)} onKeyDown={navigateTabs}>
          <span className={`voice-stage-number${recorded ? " is-complete" : ""}`}>{recorded ? <Icon name="check" size={13} /> : `0${index + 1}`}</span>
          {kind === "challenge" ? labels.challengeStep : labels.benefitStep}
        </button>;
      })}
    </div>
    <section className="agreement-voice-workspace" role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-${active}`} tabIndex={0}>
      <div className="agreement-voice-question"><h3>{title}</h3><p>{isChallenge ? labels.challengePrompt : labels.benefitPrompt}</p></div>
      <VoiceRecorderButton key={active} voice={voice} onChange={value => onVoiceChange(active, value)} onBusyChange={onRecordingChange} label={title} hint={isChallenge ? labels.challengeHint : labels.benefitHint} recordLabel={isChallenge ? labels.recordChallenge : labels.recordBenefit} />
      <aside className="agreement-voice-inspiration" aria-label={labels.exampleLabel}>
        <span>{labels.exampleLabel}</span>
        <p>{isChallenge ? labels.challengeExample : labels.benefitExamples[0].text}</p>
        {!isChallenge && <small>{labels.benefitReminder}</small>}
      </aside>
    </section>
  </section>;
}
