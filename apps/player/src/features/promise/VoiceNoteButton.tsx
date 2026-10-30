import type { MouseEvent } from "react";
import { playerCopy as copy } from "@playbit/content/player";
import { Icon } from "../../components/ui/Icon";
import type { VoiceNote } from "../../data/types";
import { useVoicePlayback } from "./useVoicePlayback";

export function VoiceWave({ tone = "lime", active = false }: { tone?: "lime" | "purple" | "dark" | "stake"; active?: boolean }) {
  const heights = [34, 58, 43, 76, 48, 92, 61, 84, 45, 70, 38, 64, 48, 78];
  return <span className={`voice-wave voice-wave-${tone} ${active ? "is-active" : ""}`} aria-hidden="true">{heights.map((height, index) => <i style={{ height: `${height}%`, animationDelay: `${index * 55}ms` }} key={index} />)}</span>;
}

export function formatVoiceDuration(durationMs: number) {
  return durationMs > 0 ? `${(durationMs / 1000).toFixed(1)}″` : "—";
}

export function VoiceNoteButton({ voice, tone = "light", compact = false, onClick }: { voice: VoiceNote; tone?: "light" | "dark"; compact?: boolean; onClick?: (event: MouseEvent<HTMLButtonElement>) => void }) {
  const playback = useVoicePlayback(voice);
  const label = playback.playing ? copy.promise.voice.stopPlaying : voice.assetId ? copy.promise.voice.play : copy.promise.voice.empty;
  return <>
    <button className={`voice-note-button ${tone === "dark" ? "is-dark" : ""} ${compact ? "is-compact" : ""}`} type="button" disabled={!voice.assetId} onClick={event => { onClick?.(event); void playback.toggle(); }} aria-busy={playback.loading} aria-label={`${label} · ${formatVoiceDuration(voice.durationMs)}`}>
      <span className="voice-note-icon"><Icon name={playback.playing ? "stop" : "play"} size={compact ? 14 : 17} /></span>
      <span className="voice-note-copy"><b>{playback.playing ? copy.promise.voice.playing : label}</b><small>{formatVoiceDuration(voice.durationMs)}</small></span>
    </button>
    {playback.error && <span className="voice-playback-error" role="alert">{playback.error}</span>}
  </>;
}
