import { useEffect, useState } from "react";
import { playerCopy as copy } from "@playbit/content/player";
import type { VoiceNote } from "../../data/types";
import { Icon } from "../../components/ui/Icon";
import { Sheet } from "../../components/ui/Sheet";
import { VoiceRecorderButton } from "../promise/VoiceRecorderButton";

const emptyVoice: VoiceNote = { id: "", durationMs: 0, storage: "demo" };

export function StakeVoiceSheet({ open, onClose, voice, existing, onSave, onRemove }: {
  open: boolean;
  onClose: () => void;
  voice?: VoiceNote;
  existing: boolean;
  onSave: (voice: VoiceNote) => void;
  onRemove?: () => void;
}) {
  const [recordedVoice, setRecordedVoice] = useState<VoiceNote>(voice ?? emptyVoice);
  const [recording, setRecording] = useState(false);
  useEffect(() => {
    if (!open) return;
    setRecordedVoice(voice ?? emptyVoice);
    setRecording(false);
  }, [open, voice]);
  const hasVoice = Boolean(recordedVoice.assetId);

  return <Sheet open={open} onClose={onClose} title={copy.play.stakeTitle} eyebrow="VOICE STAKE" description={copy.play.stakeHint}>
    <div className="stake-voice-content">
      <div className="stake-voice-mark" aria-hidden="true"><Icon name="mic" size={15} /><span>{copy.play.stakeVoiceHint}</span></div>
      <VoiceRecorderButton voice={recordedVoice} onChange={setRecordedVoice} onBusyChange={setRecording} label={copy.play.stakeVoice} hint={copy.play.stakeVoiceHint} recordLabel={copy.play.stakeVoiceRecord} compact />
      <div className="stake-voice-actions">
        <button className="primary-button" type="button" disabled={!hasVoice || recording} onClick={() => onSave(recordedVoice)}><Icon name="check" size={15} />{existing ? copy.play.stakeVoiceReady : copy.play.stakeConfirm}</button>
        {existing && onRemove && <button className="text-button" type="button" onClick={onRemove}>{copy.play.removeStake}</button>}
      </div>
    </div>
  </Sheet>;
}
