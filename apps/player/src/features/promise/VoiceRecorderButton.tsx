import * as Dialog from "@radix-ui/react-dialog";
import { useRef, useState } from "react";
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

export function VoiceRecorderButton({ voice, onChange, label, hint, recordLabel }: { voice: VoiceNote; onChange: (voice: VoiceNote) => void; label: string; hint: string; recordLabel: string }) {
  const [open, setOpen] = useState(false);
  const recordButton = useRef<HTMLButtonElement>(null);
  const playback = useVoicePlayback(voice);
  const recorder = useVoiceRecorder(value => { onChange(value); setOpen(false); });
  const hasVoice = Boolean(voice.assetId);
  const recording = recorder.status === "recording";
  const busy = recorder.status === "requesting" || recorder.status === "saving";
  const time = formatTimer(recorder.elapsedMs);

  function start() {
    playback.stop();
    setOpen(true);
    void recorder.start();
  }

  function close() {
    if (recorder.status === "saving") return;
    recorder.cancel();
    setOpen(false);
  }

  return <div className="voice-recorder">
    <div className={`voice-composer ${hasVoice ? "has-voice" : ""}`} role="group" aria-label={label}>
      {hasVoice ? <>
        <button className="voice-composer-primary is-playback" type="button" onClick={() => void playback.toggle()} aria-busy={playback.loading} aria-label={`${label} · ${playback.playing ? copy.promise.voice.stopPlaying : copy.promise.voice.play}`} title={playback.playing ? copy.promise.voice.stopPlaying : copy.promise.voice.play}><Icon name={playback.playing ? "stop" : "play"} size={30} /></button>
        <div className="voice-composer-take"><VoiceWave active={playback.playing} /><span>{formatVoiceDuration(voice.durationMs)}</span></div>
        <button className="voice-composer-rerecord" ref={recordButton} type="button" onClick={start} aria-label={`${label} · ${copy.promise.voice.recordAgain}`}><Icon name="restart" size={13} />{copy.promise.voice.recordAgain}</button>
      </> : <>
        <button className="voice-composer-primary" ref={recordButton} type="button" onClick={start} aria-label={`${label} · ${copy.promise.voice.record}`} title={copy.promise.voice.record}><Icon name="mic" size={30} /></button>
        <span className="voice-composer-label">{recordLabel}</span>
      </>}
    </div>
    {playback.error && <small className="voice-playback-error" role="alert">{playback.error}</small>}

    <Dialog.Root open={open} onOpenChange={value => { if (!value) close(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="recording-overlay" />
        <Dialog.Content className="recording-screen" onCloseAutoFocus={event => { event.preventDefault(); recordButton.current?.focus(); }} onPointerDownOutside={event => event.preventDefault()} onEscapeKeyDown={event => { event.preventDefault(); close(); }}>
          <header className="recording-header"><span className={recording ? "is-live" : ""}><i />{recording ? copy.promise.voice.live : copy.promise.voice.recorder}</span><button className="recording-close" type="button" disabled={recorder.status === "saving"} onClick={close} aria-label={copy.promise.voice.cancelRecording} title={copy.promise.voice.cancelRecording}><Icon name="close" size={21} /></button></header>
          <div className="sr-only"><Dialog.Title>{label}</Dialog.Title><Dialog.Description>{hint}</Dialog.Description></div>
          <div className="recording-signal"><RecordingWaveform stream={recorder.stream} /></div>
          <div className="recording-controls">
            <div className="recording-readout">
              <div className="recording-time" role="timer" aria-live="off">{time.seconds}<small>.{time.tenths}</small></div>
              <p className={`recording-status ${recorder.error ? "has-error" : ""}`} role="status">{recorder.error || (recorder.status === "requesting" ? copy.promise.voice.requesting : recorder.status === "saving" ? copy.promise.voice.saving : copy.promise.voice.live)}</p>
            </div>
            <button className={`recording-main-button ${recording ? "is-recording" : ""}`} type="button" onClick={() => recording ? recorder.stop() : void recorder.start()} disabled={busy} aria-label={recording ? copy.promise.voice.stopRecording : copy.promise.voice.recordAgain} title={recording ? copy.promise.voice.stopRecording : copy.promise.voice.recordAgain}><Icon name={recording ? "stop" : "mic"} size={23} /></button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  </div>;
}
