import { useEffect, useState, type CSSProperties, type MouseEvent } from "react";
import { playerCopy as copy } from "@playbit/content/player";
import { Icon } from "../../components/ui/Icon";
import type { GameCard as Card, VoiceNote } from "../../data/types";
import { CardMedia, type CardPalette } from "./CardMedia";
import { CardRules } from "./CardRules";
import { VoiceWave } from "../promise/VoiceNoteButton";

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

export function GameCard({ card, flipped, slide, stake, stakeVoice, stakeIssued, active = true, onFlip, onStake: _onStake, onIssue, liked, saved, gestureGuide, swipeHint, returnHint, onLike, onSave, onComment, onShare, onPalette, paletteOverride }: {
  card: Card; flipped: boolean; slide: string; stake?: string; stakeVoice?: VoiceNote; stakeIssued?: boolean; active?: boolean;
  onFlip: (value: boolean) => void; onStake?: () => void; onIssue: () => void;
  liked?: boolean; saved?: boolean; gestureGuide?: boolean; swipeHint?: string; returnHint?: string; onLike?: () => void; onSave?: () => void; onComment?: () => void; onShare?: () => void;
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
  useEffect(() => setPalette(fallbackPalette), [card.id]);
  useEffect(() => { if (!card.media) onPalette?.(fallbackPalette); }, [card.id, card.media, onPalette]);
  function applyMediaPalette(next: CardPalette) {
    setPalette(next);
    onPalette?.(next);
  }
  const stakePreview = stakeVoice?.assetId ? <><Icon name="mic" size={13} /><VoiceWave tone="dark" /><span>{copy.play.stakeVoice}</span></> : <><Icon name={stake ? "trophy" : "plus"} size={14} /><span>{stake ?? copy.play.stake}</span></>;
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
        </div>
        <div className="feed-footer">
          <p className="feed-teaser">{card.payoff}</p>
          <div className="card-social" aria-label={copy.play.socialLabel}>
            <button type="button" className={`card-social-action ${liked ? "is-liked" : ""}`} onClick={onLike} aria-label={liked ? copy.play.unliked : copy.play.liked} aria-pressed={liked}><Icon name="heart" size={17} /></button>
            <button type="button" className="card-social-action" onClick={onComment} aria-label={copy.play.comment} title={copy.play.comment}><Icon name="comment" size={17} /></button>
            <button type="button" className={`card-social-action ${saved ? "is-saved" : ""}`} onClick={onSave} aria-label={copy.play.collect} title={copy.play.collect}><Icon name="bookmark" size={17} /></button>
            <button type="button" className="card-social-action" onClick={onShare} aria-label={copy.play.share} title={copy.play.share}><Icon name="share" size={17} /></button>
          </div>
          <span className="swipe-tip">{gestureGuide ? copy.play.gestureGuide : swipeHint ?? copy.play.swipe}</span>
        </div>
      </div>
      <div className="card-face card-back" inert={!flipped} aria-hidden={!flipped}>
        <div className="feed-rule-content" data-feed-scroll>
          <h1 className="feed-rule-kicker">{copy.play.howToPlay}</h1><TypedRule text={card.rule} active={flipped} />
          <CardRules card={card} />
        </div>
        <div className="feed-footer">
          {stake && <div className="feed-stake-line"><button className={`stake-token read-only ${stakeVoice?.assetId ? "has-voice" : ""}`} type="button" onClick={onIssue} aria-label={stakeVoice?.assetId ? copy.play.stakeVoice : stake}>
            {stakePreview}{stakeIssued && <Icon name="check" size={12} />}
          </button></div>}
          <span className="swipe-tip">{returnHint ?? copy.play.returnHint}</span>
        </div>
      </div>
    </div></div>
  </article>;
}
