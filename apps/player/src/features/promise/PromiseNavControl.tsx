import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { playerCopy as copy } from "@playbit/content/player";
import { Icon } from "../../components/ui/Icon";
import { usePlayer } from "../player/PlayerProvider";
import { recordingCue } from "./recordingCue";
import { applyPromiseVoice } from "./promiseVoiceState";
import { useVoiceRecorder } from "./useVoiceRecorder";
import { VoiceRecordingOverlay } from "./VoiceRecordingOverlay";

const HOLD_TO_RECORD_MS = 220;

export function PromiseNavControl() {
  const { state, update, notify } = usePlayer();
  const recorder = useVoiceRecorder(nextVoice => {
    update(current => ({ ...current, draft: applyPromiseVoice(current.draft, nextVoice) }));
  });
  const [holding, setHolding] = useState(false);
  const holdTimer = useRef<number | null>(null);
  const pointerId = useRef<number | null>(null);
  const holdTriggered = useRef(false);
  const suppressClick = useRef(false);

  const recording = recorder.status === "requesting" || recorder.status === "recording" || recorder.status === "saving";
  const showRecordingOverlay = holding || recording;
  const arming = holding && !recording;

  useEffect(() => () => {
    if (holdTimer.current !== null) window.clearTimeout(holdTimer.current);
    recorder.cancel();
  }, []);

  function clearHoldTimer() {
    if (holdTimer.current !== null) window.clearTimeout(holdTimer.current);
    holdTimer.current = null;
  }

  function startRecording() {
    if (state.draft.step !== 0) return;
    holdTriggered.current = true;
    recordingCue("start");
    void recorder.start();
  }

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (state.draft.step !== 0 || !event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) return;
    event.preventDefault();
    setHolding(true);
    pointerId.current = event.pointerId;
    holdTriggered.current = false;
    clearHoldTimer();
    holdTimer.current = window.setTimeout(startRecording, HOLD_TO_RECORD_MS);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function finishPointer(event: PointerEvent<HTMLButtonElement>, cancelled = false) {
    if (pointerId.current !== event.pointerId) return;
    clearHoldTimer();
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    pointerId.current = null;
    setHolding(false);
    if (!holdTriggered.current) return;
    suppressClick.current = true;
    if (cancelled) recorder.cancel();
    else {
      recordingCue("stop");
      recorder.stop();
    }
  }

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (suppressClick.current) {
      suppressClick.current = false;
      event.preventDefault();
      return;
    }
    if (state.draft.step === 0) notify(copy.promise.voice.recordChallenge);
  }

  const label = copy.promise.voice.challengeLabel;
  const ariaLabel = `${label} · ${copy.promise.voice.recordChallenge}`;

  return <>
    <button
      className={`nav-item nav-play play nav-stake nav-promise ${recording ? "is-recording" : ""}`}
      type="button"
      aria-label={ariaLabel}
      aria-busy={recording}
      onPointerDown={handlePointerDown}
      onPointerUp={finishPointer}
      onPointerCancel={event => finishPointer(event, true)}
      onClick={handleClick}
    >
      <span className="stake-nav-mark" aria-hidden="true">
        <Icon name="mic" size={15} />
      </span>
      <span>{label}</span>
    </button>
    <VoiceRecordingOverlay open={showRecordingOverlay} arming={arming} label={copy.promise.voice.challengeLabel} recordingLabel={copy.promise.voice.live} />
  </>;
}
