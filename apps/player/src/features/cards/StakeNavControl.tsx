import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { playerCopy as copy } from "@playbit/content/player";
import { Icon } from "../../components/ui/Icon";
import { usePlayer } from "../player/PlayerProvider";
import { useVoiceRecorder } from "../promise/useVoiceRecorder";
import { VoiceWave } from "../promise/VoiceNoteButton";
import { saveStakeVoice } from "./stakeState";

export const STAKE_NAV_ACTION = "playbit:stake-nav-action";
type StakeNavAction = "issue" | "share" | "clear";
const HOLD_TO_RECORD_MS = 220;

function recordingCue(kind: "start" | "stop") {
  if (typeof AudioContext === "undefined") return;
  try {
    const context = new AudioContext();
    void context.resume().catch(() => undefined);
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime;
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(kind === "start" ? 560 : 420, start);
    oscillator.frequency.exponentialRampToValueAtTime(kind === "start" ? 760 : 300, start + .07);
    gain.gain.setValueAtTime(.0001, start);
    gain.gain.exponentialRampToValueAtTime(.028, start + .008);
    gain.gain.exponentialRampToValueAtTime(.0001, start + .09);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + .09);
    oscillator.addEventListener("ended", () => { void context.close(); }, { once: true });
  } catch {
    // Recording remains usable when Web Audio is unavailable.
  }
}

export function StakeNavControl() {
  const { state, update, notify } = usePlayer();
  const [holding, setHolding] = useState(false);
  const cardId = state.cardId;
  const stake = state.stakes[cardId];
  const issuance = state.issuedStakes[cardId] ?? null;
  const stakeRecord = state.stakeRecords[cardId];
  const flipped = Boolean(issuance || stakeRecord?.locked);
  const canRecord = !flipped && !issuance && !stakeRecord?.locked;
  const recorder = useVoiceRecorder(nextVoice => {
    update(current => saveStakeVoice(current, cardId, nextVoice, copy.play.defaultStake));
  }, () => notify(copy.play.stakeTranscriptionUnavailable));
  const holdTimer = useRef<number | null>(null);
  const pointerId = useRef<number | null>(null);
  const holdTriggered = useRef(false);
  const suppressClick = useRef(false);

  useEffect(() => () => {
    if (holdTimer.current !== null) window.clearTimeout(holdTimer.current);
  }, []);

  useEffect(() => {
    const handleStakeAction = (event: Event) => {
      const detail = (event as CustomEvent<{ action?: StakeNavAction; cardId?: string }>).detail;
      if (detail?.action === "clear" && detail.cardId === cardId) recorder.cancel();
    };
    window.addEventListener(STAKE_NAV_ACTION, handleStakeAction);
    return () => window.removeEventListener(STAKE_NAV_ACTION, handleStakeAction);
  }, [cardId, recorder.cancel]);

  function clearHoldTimer() {
    if (holdTimer.current !== null) window.clearTimeout(holdTimer.current);
    holdTimer.current = null;
  }

  function startRecording() {
    if (!canRecord) return;
    holdTriggered.current = true;
    recordingCue("start");
    void recorder.start();
  }

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (!canRecord || !event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) return;
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

  function dispatchAction(action: StakeNavAction) {
    window.dispatchEvent(new CustomEvent(STAKE_NAV_ACTION, { detail: { action } }));
  }

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (suppressClick.current) {
      suppressClick.current = false;
      event.preventDefault();
      return;
    }
    if (flipped) {
      if (stake) dispatchAction(issuance ? "share" : "issue");
      return;
    }
    if (canRecord) notify(copy.play.stakeNavHoldHint);
  }

  const recording = recorder.status === "requesting" || recorder.status === "recording" || recorder.status === "saving";
  const showRecordingOverlay = holding || recording;
  const arming = holding && !recording;
  const flippedLabel = copy.play.stakeNavSettlement;
  const label = flipped ? flippedLabel : copy.play.stake;
  const ariaLabel = flipped
    ? `${flippedLabel}${stake ? "" : " · 暂无彩头"}`
    : `${copy.play.stake} · ${copy.play.stakeNavHoldHint}`;

  return <>
    <button
      className={`nav-item nav-play play nav-stake ${flipped ? "is-flipped" : ""} ${recording ? "is-recording" : ""}`}
      type="button"
      aria-label={ariaLabel}
      aria-disabled={flipped && !stake}
      disabled={flipped && !stake}
      onPointerDown={handlePointerDown}
      onPointerUp={finishPointer}
      onPointerCancel={event => finishPointer(event, true)}
      onClick={handleClick}
    >
      <span className="stake-nav-mark" aria-hidden="true">
        {flipped ? <Icon name="send" size={15} /> : <Icon name="mic" size={15} />}
      </span>
      <span>{label}</span>
    </button>
    {showRecordingOverlay && <div
      className={`stake-recording-overlay ${arming ? "is-arming" : "is-recording"}`}
      role="status"
      aria-live="polite"
      aria-label={arming ? copy.play.stake : copy.play.stakeNavRecording}
    >
      <div className="stake-recording-focus" aria-hidden="true">
        <span className="stake-recording-charge" />
        <span className="stake-recording-wave"><VoiceWave tone="stake" active /></span>
      </div>
      <span className="stake-recording-status">{arming ? copy.play.stake : copy.play.stakeNavRecording}</span>
    </div>}
  </>;
}
