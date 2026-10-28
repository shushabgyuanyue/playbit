import { useEffect, useId, useRef } from "react";
import { playerCopy as copy } from "@playbit/content/player";
import { Icon } from "../../components/ui/Icon";
import type { VoiceNote } from "../../data/types";
import { RecordingWaveform } from "./RecordingWaveform";
import { formatVoiceDuration, VoiceWave } from "./VoiceNoteButton";
import { useVoicePlayback } from "./useVoicePlayback";
import { useVoiceRecorder } from "./useVoiceRecorder";

function formatTimer(durationMs: number) {
  const seconds = Math.floor(durationMs / 1000);
  return { seconds: `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`, tenths: Math.floor(durationMs / 100) % 10 };
}

export function VoiceRecorderButton({ voice, onChange, onBusyChange, label, hint, recordLabel }: { voice: VoiceNote; onChange: (voice: VoiceNote) => void; onBusyChange: (busy: boolean) => void; label: string; hint: string; recordLabel: string }) {
  const hintId = useId();
  const primaryButton = useRef<HTMLButtonElement>(null);
  const wasCapturing = useRef(false);
  const playback = useVoicePlayback(voice);
  const recorder = useVoiceRecorder(onChange);
  const hasVoice = Boolean(voice.assetId);
  const recording = recorder.status === "recording";
  const busy = recorder.status === "requesting" || recorder.status === "saving";
  const capturing = recording || busy;
  const time = formatTimer(recorder.elapsedMs);

  useEffect(() => {
    onBusyChange(capturing);
    if (wasCapturing.current && !capturing) primaryButton.current?.focus();
    wasCapturing.current = capturing;
    return () => onBusyChange(false);
  }, [capturing, onBusyChange]);

  function start() {
    playback.stop();
    void recorder.start();
  }

  return <div className={`voice-recorder${capturing ? " is-capturing" : ""}`}>
    <span id={hintId} className="sr-only">{hint}</span>
    <div className={`voice-composer${capturing ? " is-capturing" : hasVoice ? " has-voice" : ""}`} role="group" aria-label={label} aria-describedby={hintId}>
      {capturing ? <>
        <button className="voice-composer-primary is-recording" ref={primaryButton} type="button" onClick={recorder.stop} disabled={busy} aria-label={copy.promise.voice.stopRecording} title={copy.promise.voice.stopRecording}><Icon name="stop" size={22} /><small>{copy.save}</small></button>
        <div className="voice-capture-readout">{busy ? <span role="status">{recorder.status === "requesting" ? copy.promise.voice.requesting : copy.promise.voice.saving}</span> : <><RecordingWaveform stream={recorder.stream} /><span role="timer" aria-live="off">{time.seconds}<small>.{time.tenths}</small></span><span className="sr-only" role="status">{copy.promise.voice.live}</span></>}</div>
        <button className="voice-composer-cancel" type="button" disabled={recorder.status === "saving"} onClick={recorder.cancel} aria-label={copy.promise.voice.cancelRecording} title={copy.promise.voice.cancelRecording}><Icon name="close" size={16} /></button>
      </> : hasVoice ? <>
        <button className="voice-composer-primary is-playback" ref={primaryButton} type="button" onClick={() => void playback.toggle()} aria-busy={playback.loading} aria-label={`${label} · ${playback.playing ? copy.promise.voice.stopPlaying : copy.promise.voice.play}`} title={playback.playing ? copy.promise.voice.stopPlaying : copy.promise.voice.play}><Icon name={playback.playing ? "stop" : "play"} size={30} /></button>
        <div className="voice-composer-take"><VoiceWave active={playback.playing} /><span>{formatVoiceDuration(voice.durationMs)}</span></div>
        <button className="voice-composer-rerecord" type="button" onClick={start} aria-label={`${label} · ${copy.promise.voice.recordAgain}`}><Icon name="restart" size={13} />{copy.promise.voice.recordAgain}</button>
      </> : <>
        <button className="voice-composer-primary" ref={primaryButton} type="button" onClick={start} aria-label={`${label} · ${copy.promise.voice.record}`} title={copy.promise.voice.record}><Icon name="mic" size={30} /></button>
        <span className="voice-composer-label">{recordLabel}</span>
      </>}
    </div>
    {(recorder.error || playback.error) && <small className="voice-playback-error" role="alert">{recorder.error || playback.error}</small>}
  </div>;
}
