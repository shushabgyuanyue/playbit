import { useEffect } from "react";
import { playerCopy as copy } from "@playbit/content/player";
import type { VoiceNote } from "../../data/types";
import { formatVoiceDuration, VoiceWave } from "../promise/VoiceNoteButton";
import { useVoicePlayback } from "../promise/useVoicePlayback";

export function CouponVoiceProof({ voice, active }: { voice: VoiceNote; active: boolean }) {
  const playback = useVoicePlayback(voice);
  useEffect(() => { if (!active) playback.stop(); }, [active, playback.stop]);
  return <div className="coupon-audio-signature">
    <button className="coupon-audio-play" type="button" tabIndex={active ? 0 : -1} disabled={!voice.assetId} aria-label={playback.playing ? copy.promise.voice.stopPlaying : copy.promise.voice.play} title={playback.playing ? copy.promise.voice.stopPlaying : copy.promise.voice.play} aria-pressed={playback.playing} aria-busy={playback.loading} onClick={event => { event.stopPropagation(); void playback.toggle(); }}>
      <VoiceWave tone="purple" active={playback.playing} />
      <small>{formatVoiceDuration(voice.durationMs)}</small>
    </button>
    {playback.error && <span className="coupon-audio-error" role="alert">{playback.error}</span>}
  </div>;
}
