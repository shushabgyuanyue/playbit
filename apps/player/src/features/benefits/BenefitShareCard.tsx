import { useEffect } from "react";
import { playerCopy as copy } from "@playbit/content/player";
import { Icon } from "../../components/ui/Icon";
import type { CouponSource, VoiceNote } from "../../data/types";
import { couponTone } from "../player/transitions";
import { formatVoiceDuration, VoiceWave } from "../promise/VoiceNoteButton";
import { useVoicePlayback } from "../promise/useVoicePlayback";

const noVoice: VoiceNote = { id: "", durationMs: 0, storage: "demo" };

export function BenefitShareCard({ title, context, issuerName, status, source, voice, active }: {
  title: string; context: string; issuerName: string; status: string; source: CouponSource; voice?: VoiceNote; active: boolean;
}) {
  const playback = useVoicePlayback(voice ?? noVoice);
  const sourceLabel = copy.wallet.issueSourceOptions[source === "direct" ? "manual" : source];
  useEffect(() => { if (!active) playback.stop(); }, [active, playback.stop]);

  return <div className="benefit-share-preview">
    <article className={`coupon-ticket benefit-share-card ${couponTone(source)}`} aria-label={title}>
      <div className="ticket-main">
        <small>{sourceLabel}{context && context !== title ? ` · ${context}` : ""}</small>
        <strong>{title}</strong>
        <span>{issuerName} · {status}</span>
      </div>
      <div className="ticket-actions">
        {voice?.assetId ? <button className="benefit-share-audio" type="button" aria-label={playback.playing ? copy.promise.voice.stopPlaying : copy.promise.voice.play} title={playback.playing ? copy.promise.voice.stopPlaying : copy.promise.voice.play} aria-pressed={playback.playing} aria-busy={playback.loading} onClick={() => void playback.toggle()}>
          <VoiceWave tone={source === "promise" ? "lime" : "dark"} active={playback.playing} />
          <small>{formatVoiceDuration(voice.durationMs)}</small>
        </button> : <span className="benefit-share-mark"><Icon name="share" size={22} /><small>{sourceLabel}</small></span>}
      </div>
    </article>
    {playback.error && <small className="voice-playback-error" role="alert">{playback.error}</small>}
  </div>;
}
