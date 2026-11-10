import { playerCopy as copy } from "@playbit/content/player";
import { Icon } from "../../components/ui/Icon";
import type { PromiseDraft } from "../../data/types";
import { formatVoiceDuration, VoiceWave } from "./VoiceNoteButton";
import { useVoicePlayback } from "./useVoicePlayback";

export function VoiceAgreementEditor({ draft }: {
  draft: PromiseDraft;
}) {
  const labels = copy.promise.voice;
  const title = labels.challengeLabel;
  const hasVoice = Boolean(draft.voice.assetId);
  const playback = useVoicePlayback(draft.voice);
  const transcript = draft.voice.transcript?.trim() || (draft.text.trim() !== labels.challengeLabel ? draft.text.trim() : "");
  return <section className="agreement-editor" aria-label={labels.creationTitle}>
    <header className="agreement-edit-header"><h2>{labels.creationTitle}</h2><p>{labels.creationNote}</p></header>
    <section className={`agreement-voice-workspace${hasVoice ? " has-voice" : ""}`}>
      <div className="agreement-voice-question"><span>{title}</span><p>{labels.challengePrompt}</p></div>
      {hasVoice ? <div className="agreement-voice-result" aria-live="polite">
        <p className={transcript ? "agreement-voice-transcript" : "agreement-voice-transcript is-pending"}>
          {transcript || labels.savedWithoutTranscript}
        </p>
        <button
          className={`agreement-voice-playback${playback.playing ? " is-playing" : ""}`}
          type="button"
          disabled={!draft.voice.assetId}
          aria-busy={playback.loading}
          aria-label={`${playback.playing ? copy.promise.voice.stopPlaying : copy.promise.shareCard.listenChallenge} · ${formatVoiceDuration(draft.voice.durationMs)}`}
          onClick={() => void playback.toggle()}
        >
          <span className="agreement-voice-playback-mark"><Icon name={playback.playing ? "stop" : "play"} size={13} /></span>
          <VoiceWave tone="dark" active={playback.playing} />
          <span>{playback.loading ? copy.promise.shareCard.audioLoading : playback.playing ? copy.promise.voice.playing : labels.play}</span>
          <small>{formatVoiceDuration(draft.voice.durationMs)}</small>
        </button>
        {playback.error && <small className="voice-playback-error" role="alert">{playback.error}</small>}
        <small className="agreement-voice-rerecord-hint">{labels.recordAgainHint}</small>
      </div> : <aside className="agreement-voice-inspiration">
        <span className="agreement-voice-inspiration-wave"><VoiceWave tone="purple" /></span>
        <span>{labels.exampleLabel}</span>
        <p>{labels.challengeExample}</p>
        <small>{labels.recordHint}</small>
      </aside>}
    </section>
  </section>;
}
