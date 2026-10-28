import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { playerCopy as copy } from "@playbit/content/player";
import { Icon } from "../../components/ui/Icon";
import type { VoiceNote } from "../../data/types";
import { formatVoiceDuration, VoiceWave } from "./VoiceNoteButton";
import { useVoicePlayback } from "./useVoicePlayback";

export function RevealVoiceSeal({ voice, benefit }: { voice: VoiceNote; benefit: string }) {
  const [revealed, setRevealed] = useState(false);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const gesture = useRef<{ id: number; x: number; width: number } | null>(null);
  const suppressClick = useRef(false);
  const sealButton = useRef<HTMLButtonElement>(null);
  const playButton = useRef<HTMLButtonElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const playback = useVoicePlayback(voice);
  const labels = copy.promise.shareCard;

  useEffect(() => {
    if (revealed && document.activeElement === sealButton.current) {
      const target = playButton.current?.disabled ? content.current : playButton.current;
      target?.focus({ preventScroll: true });
    }
  }, [revealed]);

  function reveal() {
    if (revealed) return;
    setRevealed(true);
    if (voice.assetId) void playback.toggle();
  }

  function finish(event: PointerEvent<HTMLButtonElement>, cancelled = false) {
    const start = gesture.current;
    if (!start || event.pointerId !== start.id) return;
    const distance = event.clientX - start.x;
    gesture.current = null;
    setDragging(false);
    const complete = !cancelled && Math.abs(distance) >= start.width * .48;
    setOffset(complete ? distance : 0);
    suppressClick.current = cancelled || suppressClick.current || Math.abs(distance) > 5;
    if (complete) reveal();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return <><div className={`agreement-audio reward-audio ${revealed ? "is-revealed" : ""}`}>
    <div ref={content} className="reward-audio-content" tabIndex={-1} aria-hidden={!revealed} inert={!revealed}>
      <span className="agreement-audio-label"><Icon name="gift" size={15} />{copy.promise.voice.benefitLabel}</span>
      {benefit === copy.promise.voice.benefitLabel ? <VoiceWave tone="purple" active={playback.playing} /> : <strong>{benefit}</strong>}
      <button ref={playButton} className="agreement-audio-play" type="button" disabled={!voice.assetId} aria-busy={playback.loading} aria-label={playback.playing ? copy.promise.voice.stopPlaying : labels.listenBenefit} onClick={() => void playback.toggle()}>
        <span>{playback.loading ? labels.audioLoading : playback.playing ? copy.promise.voice.playing : voice.assetId ? labels.listenBenefit : labels.noVoice}</span>
        <Icon name={playback.playing ? "stop" : "play"} size={17} />
      </button>
    </div>
    <button ref={sealButton} className={`voice-tear-seal ${dragging ? "is-dragging" : ""}`} type="button" aria-label={labels.tearAction} aria-expanded={revealed} tabIndex={revealed ? -1 : 0} aria-hidden={revealed} style={{ "--tear-x": `${offset}px`, "--tear-end": offset < 0 ? "-115%" : "115%", "--tear-rotation": `${offset * .025}deg` } as CSSProperties}
      onPointerDown={event => {
        if (event.button !== 0 || gesture.current || revealed) return;
        suppressClick.current = false;
        gesture.current = { id: event.pointerId, x: event.clientX, width: event.currentTarget.clientWidth };
        event.currentTarget.setPointerCapture(event.pointerId);
        setDragging(true);
      }}
      onPointerMove={event => {
        const start = gesture.current;
        if (!start || event.pointerId !== start.id) return;
        const distance = event.clientX - start.x;
        if (Math.abs(distance) > 5) suppressClick.current = true;
        setOffset(Math.max(-start.width * 1.15, Math.min(start.width * 1.15, distance)));
      }}
      onPointerUp={event => finish(event)} onPointerCancel={event => finish(event, true)} onLostPointerCapture={event => finish(event, true)}
      onClick={event => { if (event.detail === 0 || !suppressClick.current) reveal(); }}>
      <span className="agreement-audio-label"><Icon name="lock" size={16} />{labels.sealedBenefit}</span>
      <span className="voice-seal-watermark" aria-hidden="true">?</span>
      <span className="voice-seal-bottom"><span>{labels.tearShort}</span><VoiceWave tone="lime" /></span>
      <span className="voice-seal-grip" aria-hidden="true"><i /><i /><i /></span>
    </button>
    {revealed && <span className="sr-only" role="status">{labels.revealed}</span>}
    <span className="agreement-audio-duration">{formatVoiceDuration(voice.durationMs)}</span>
  </div>{playback.error && <p className="agreement-audio-error reward-audio-error" role="alert">{playback.error}</p>}</>;
}
