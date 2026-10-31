import { useEffect, useState, type CSSProperties, type MouseEvent } from "react";
import { playerCopy as copy } from "@playbit/content/player";
import { Icon } from "../../components/ui/Icon";
import type { GameCard as Card, VoiceNote } from "../../data/types";
import { CardMedia, type CardPalette } from "./CardMedia";
import { CardRules } from "./CardRules";
import { formatVoiceDuration, VoiceWave } from "../promise/VoiceNoteButton";
import { useVoicePlayback } from "../promise/useVoicePlayback";

function TypedRule({ text, active }: { text: string; active: boolean }) {
  const [typed, setTyped] = useState("");
  useEffect(() => {
    if (!active) { setTyped(""); return; }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setTyped(text); return; }
    let cursor = 0;
    const timer = window.setInterval(() => {
      cursor += 1;
      setTyped(text.slice(0, cursor));
      if (cursor >= text.length) window.clearInterval(timer);
    }, 58);
    return () => window.clearInterval(timer);
  }, [text, active]);
  return <p className="feed-rule"><span className="sr-only">{text}</span><span className="rule-reserve" aria-hidden="true">{text}</span><span className="rule-reveal" aria-hidden="true">{typed}</span></p>;
}

function CardVoicePlayer({ voice, playback }: { voice?: VoiceNote; playback: ReturnType<typeof useVoicePlayback> }) {
  if (!voice?.assetId) return null;
  const label = playback.playing ? copy.promise.voice.stopPlaying : copy.promise.voice.play;
  return <button className={`card-voice-player ${playback.playing ? "is-playing" : ""}`} type="button" onClick={() => void playback.toggle()} aria-busy={playback.loading} aria-label={`${label} · ${formatVoiceDuration(voice.durationMs)}`}>
    <span className="card-voice-gift" aria-hidden="true">
      <span className="card-voice-bow"><i /><i /><b /></span>
      <span className="card-voice-wave"><VoiceWave tone="stake" active={playback.playing} /></span>
    </span>
  </button>;
}

function CardStakeTranscript({ voice }: { voice?: VoiceNote }) {
  const text = voice?.transcript?.trim();
  if (!text) return null;
  return <div className="card-stake-copy">
    <span className="card-stake-label">彩头<span className="card-stake-dot" aria-hidden="true" /></span>
    <p className="card-stake-transcript">{text}</p>
  </div>;
}

export function GameCard({ card, flipped, slide, stakeVoice, active = true, onFlip, liked, saved, canRemoveSaved, gestureGuide, swipeHint, returnHint, onLike, onSave, onComment, onShare, onPalette, paletteOverride }: {
  card: Card; flipped: boolean; slide: string; stakeVoice?: VoiceNote; active?: boolean;
  onFlip: (value: boolean) => void;
  liked?: boolean; saved?: boolean; canRemoveSaved?: boolean; gestureGuide?: boolean; swipeHint?: string; returnHint?: string; onLike?: () => void; onSave?: () => void; onComment?: () => void; onShare?: () => void;
  onPalette?: (palette: CardPalette) => void; paletteOverride?: CardPalette;
}) {
  const fallbackInk = "#fff";
  const fallbackPalette: CardPalette = card.color === "violet"
    ? { primary: "#9286a3", secondary: "#b8aec4", surface: "#e9e6ee", dark: "#302a38", ink: fallbackInk }
    : card.color === "lime"
      ? { primary: "#8e9a78", secondary: "#b6c09f", surface: "#e8ede2", dark: "#30372b", ink: fallbackInk }
      : { primary: "#a17f79", secondary: "#c2aaa4", surface: "#eee7e4", dark: "#3e3030", ink: fallbackInk };
  const [palette, setPalette] = useState<CardPalette>(fallbackPalette);
  const effectivePalette = paletteOverride ?? palette;
  const voicePlayback = useVoicePlayback(stakeVoice ?? { id: "", durationMs: 0, storage: "demo" });
  useEffect(() => setPalette(fallbackPalette), [card.id]);
  useEffect(() => { if (!card.media) onPalette?.(fallbackPalette); }, [card.id, card.media, onPalette]);
  function applyMediaPalette(next: CardPalette) {
    setPalette(next);
    onPalette?.(next);
  }
  function handleCardClick(event: MouseEvent<HTMLElement>) {
    if (!flipped || (event.target as Element).closest("button, a, input, textarea, audio, video, summary, [role='button']")) return;
    onFlip(false);
  }
  const mediaClass = `has-media media-${card.media?.kind ?? "default"}`;
  const mediaImage = card.media?.kind === "image" ? `url("${card.media.src}")` : card.media?.kind === "video" ? `url("${card.media.poster}")` : undefined;
  return <article className={`game-card ${card.color} ${card.textStyle === "quote" ? "is-quote" : ""} ${mediaClass} ${flipped ? "is-flipped" : ""} ${slide}`} data-card-id={card.id} aria-label={card.label} onClick={handleCardClick} style={{ "--card-accent": effectivePalette.primary, "--card-accent-primary": effectivePalette.primary, "--card-accent-secondary": effectivePalette.secondary, "--card-surface": effectivePalette.surface, "--card-dark": effectivePalette.dark, "--card-ink": effectivePalette.ink, "--card-media-image": mediaImage } as CSSProperties}>
    <div className="game-card-motion"><div className="card-inner">
      <div className="card-face card-front" inert={flipped} aria-hidden={flipped}>
        <div className="card-stage">{card.media ? <CardMedia media={card.media} active={active && !slide.startsWith("swipe-")} visible={!flipped} onPalette={active && !slide.startsWith("swipe-") ? applyMediaPalette : undefined} /> : <div className="card-media card-media-default" aria-hidden="true" />}</div>
        <div className="feed-story" data-feed-scroll>
          <span className="feed-category">{card.sponsor ? `${card.sponsor.disclosure} · ${card.sponsor.name}` : card.label}</span>
          <div className="prompt"><p>{card.prompt}</p><strong>{card.kicker}</strong></div>
          <CardVoicePlayer key={stakeVoice?.assetId ?? "empty"} voice={stakeVoice} playback={voicePlayback} />
        </div>
        <div className="feed-footer">
          <p className="feed-teaser">{card.payoff}</p>
          <div className="card-social" aria-label={copy.play.socialLabel}>
            <button type="button" className={`card-social-action ${liked ? "is-liked" : ""}`} onClick={onLike} aria-label={liked ? copy.play.unliked : copy.play.liked} aria-pressed={liked}><Icon name="heart" size={17} /></button>
            <button type="button" className="card-social-action" onClick={onComment} aria-label={copy.play.comment} title={copy.play.comment}><Icon name="comment" size={17} /></button>
            <button type="button" className={`card-social-action ${saved ? "is-saved" : ""}`} onClick={onSave} aria-label={saved && canRemoveSaved ? copy.play.removeCollection : copy.play.collect} title={saved && canRemoveSaved ? copy.play.removeCollection : copy.play.collect}><Icon name="bookmark" size={17} /></button>
            <button type="button" className="card-social-action" onClick={onShare} aria-label={copy.play.share} title={copy.play.share}><Icon name="share" size={17} /></button>
          </div>
          <span className="swipe-tip">{gestureGuide ? copy.play.gestureGuide : swipeHint ?? copy.play.swipe}</span>
        </div>
      </div>
      <div className="card-face card-back" inert={!flipped} aria-hidden={!flipped}>
        <div className="feed-rule-content" data-feed-scroll>
          <h1 className="feed-rule-kicker">{copy.play.howToPlay}</h1><TypedRule text={card.rule} active={flipped} />
          <CardRules card={card} />
          <CardStakeTranscript key={stakeVoice?.assetId ?? "empty"} voice={stakeVoice} />
        </div>
        <div className="feed-footer">
          <span className="swipe-tip">{returnHint ?? copy.play.returnHint}</span>
        </div>
      </div>
    </div></div>
  </article>;
}
