import { useEffect, useRef, type MouseEvent, type PointerEvent } from "react";
import { playerCopy as copy } from "@playbit/content/player";
import { usePageMemory } from "../../services/pageMemory";
import { Icon } from "../../components/ui/Icon";
import { usePlayer } from "../player/PlayerProvider";
import { useVoicePlayback } from "../promise/useVoicePlayback";
import { VoiceWave } from "../promise/VoiceNoteButton";
import { useVoiceRecorder } from "../promise/useVoiceRecorder";

export const STAKE_NAV_ACTION = "playbit:stake-nav-action";
type StakeNavAction = "issue" | "share";
const HOLD_TO_RECORD_MS = 220;

const emptyVoice = { id: "", durationMs: 0, storage: "demo" as const };

export function StakeNavControl() {
  const { state, update, notify } = usePlayer();
  const { memory } = usePageMemory();
  const cardId = state.cardId;
  const voice = state.stakeVoices[cardId] ?? emptyVoice;
  const stake = state.stakes[cardId];
  const issuance = state.issuedStakes[cardId] ?? null;
  const flipped = memory.playFlippedCardId === cardId;
  const canRecord = !flipped && !issuance;
  const playback = useVoicePlayback(voice);
  const recorder = useVoiceRecorder(nextVoice => {
    update(current => {
      const title = current.stakes[cardId] ?? copy.play.defaultStake;
      const stakeRecords = { ...current.stakeRecords };
      if (stakeRecords[cardId]) stakeRecords[cardId] = { ...stakeRecords[cardId], title, createdAt: new Date().toISOString() };
      return {
        ...current,
        stakes: { ...current.stakes, [cardId]: title },
        stakeVoices: { ...current.stakeVoices, [cardId]: nextVoice },
        stakeRecords
      };
    });
  });
  const holdTimer = useRef<number | null>(null);
  const pointerId = useRef<number | null>(null);
  const holdTriggered = useRef(false);
  const suppressClick = useRef(false);

  useEffect(() => () => {
    if (holdTimer.current !== null) window.clearTimeout(holdTimer.current);
  }, []);

  function clearHoldTimer() {
    if (holdTimer.current !== null) window.clearTimeout(holdTimer.current);
    holdTimer.current = null;
  }

  function startRecording() {
    if (!canRecord) return;
    holdTriggered.current = true;
    playback.stop();
    void recorder.start();
  }

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (!canRecord || !event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) return;
    event.preventDefault();
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
    if (!holdTriggered.current) return;
    suppressClick.current = true;
    if (cancelled) recorder.cancel();
    else recorder.stop();
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
    if (canRecord && voice.assetId) void playback.toggle();
    else if (canRecord) notify(copy.play.stakeNavHoldHint);
  }

  const recording = recorder.status === "requesting" || recorder.status === "recording" || recorder.status === "saving";
  const label = flipped ? copy.play.stakeNavShare : recording ? copy.play.stakeNavRecording : copy.play.stake;
  const ariaLabel = flipped
    ? `${copy.play.stakeNavShare}${stake ? "" : " · 暂无可分享权益"}`
    : voice.assetId ? `${copy.play.stake} · ${copy.promise.voice.play}` : `${copy.play.stake} · ${copy.play.stakeNavHoldHint}`;

  return <button
    className={`nav-item nav-play play nav-stake ${flipped ? "is-flipped" : ""} ${voice.assetId ? "has-voice" : ""} ${recording ? "is-recording" : ""}`}
    type="button"
    aria-label={ariaLabel}
    aria-disabled={flipped && !stake}
    onPointerDown={handlePointerDown}
    onPointerUp={finishPointer}
    onPointerCancel={event => finishPointer(event, true)}
    onClick={handleClick}
  >
    <span className="stake-nav-mark" aria-hidden="true">
      {flipped ? <Icon name="share" size={15} /> : recording ? <Icon name="stop" size={14} /> : voice.assetId ? <VoiceWave tone="stake" active={playback.playing} /> : <Icon name="mic" size={15} />}
    </span>
    <span>{label}</span>
  </button>;
}
