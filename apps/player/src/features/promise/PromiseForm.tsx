import { playerCopy as copy } from "@playbit/content/player";
import { useState } from "react";
import { Icon } from "../../components/ui/Icon";
import type { PromiseDraft, VoiceNote } from "../../data/types";
import { VoiceAgreementEditor } from "./VoiceAgreementEditor";

export function PromiseForm({ draft, onVoiceChange, onContinue }: { draft: PromiseDraft; onVoiceChange: (kind: "challenge" | "benefit", voice: VoiceNote) => void; onContinue: () => void }) {
  const [recording, setRecording] = useState(false);
  const [active, setActive] = useState<"challenge" | "benefit">(() => draft.challengeVoice.assetId && !draft.benefitVoice.assetId ? "benefit" : "challenge");
  const ready = Boolean(draft.challengeVoice.assetId && draft.benefitVoice.assetId);
  const activeRecorded = Boolean((active === "challenge" ? draft.challengeVoice : draft.benefitVoice).assetId);
  return <form className="bet-create" onSubmit={e => { e.preventDefault(); if (recording) return; if (ready) onContinue(); else if (activeRecorded) setActive(active === "challenge" ? "benefit" : "challenge"); }}>
    <VoiceAgreementEditor draft={draft} active={active} recording={recording} onRecordingChange={setRecording} onActiveChange={setActive} onVoiceChange={onVoiceChange} />
    <button className="contract-cta" disabled={recording || !activeRecorded}>{ready || (active === "benefit" && draft.challengeVoice.assetId) ? copy.promise.create : active === "challenge" ? copy.promise.voice.nextBenefit : copy.promise.voice.backToChallenge}<Icon name="arrow" /></button>
  </form>;
}
