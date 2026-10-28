import { useEffect, useState } from "react";
import { playerCopy as copy } from "@playbit/content/player";
import { Icon } from "../../components/ui/Icon";
import type { GameCard as Card } from "../../data/types";
import { CardMedia } from "./CardMedia";
import { CardRules } from "./CardRules";

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

export function GameCard({ card, flipped, slide, stake, stakeIssued, active = true, onFlip, onStake, onIssue }: {
  card: Card; flipped: boolean; slide: string; stake?: string; stakeIssued?: boolean; active?: boolean;
  onFlip: (value: boolean) => void; onStake: () => void; onIssue: () => void;
}) {
  const issueButton = stake && <button className={`stake-issue-icon ${stakeIssued ? "issued" : ""}`} type="button" onClick={onIssue}
    aria-label={stakeIssued ? copy.play.issueStakeSigned : copy.play.issueStake}
    title={stakeIssued ? copy.play.issueStakeSigned : copy.play.issueStake}>
    <Icon name={stakeIssued ? "check" : "share"} size={18} />
  </button>;
  return <article className={`game-card ${card.color} ${card.textStyle === "quote" ? "is-quote" : ""} ${card.media ? "has-media" : ""} ${flipped ? "is-flipped" : ""} ${slide}`} data-card-id={card.id} aria-label={card.label}>
    <div className="game-card-motion"><div className="card-inner">
      <div className="card-face card-front" inert={flipped} aria-hidden={flipped}>
        <div className="feed-story" data-feed-scroll>
          <span className="feed-category">{card.sponsor ? `${card.sponsor.disclosure} · ${card.sponsor.name}` : card.label}</span>
          <div className="prompt"><p>{card.prompt}</p><strong>{card.kicker}</strong></div>
          {card.media && <CardMedia media={card.media} active={active && !flipped && !slide.startsWith("swipe-")} />}
        </div>
        <div className="feed-footer">
          <p className="feed-teaser">{card.payoff}</p>
          <div className="feed-stake-line">
            <button className={`preview-stake ${stake ? "on" : ""}`} onClick={onStake}><Icon name={stake ? "trophy" : "plus"} size={17} /><span>{stake ?? copy.play.stake}</span>{stake && <Icon name="edit" size={13} />}</button>
            {issueButton}
          </div>
          <button className="flip-btn" onClick={() => onFlip(true)}>{copy.play.flip}<Icon name="arrow" size={19} /></button>
          <span className="swipe-tip">{copy.play.swipe}</span>
        </div>
      </div>
      <div className="card-face card-back" inert={!flipped} aria-hidden={!flipped}>
        <div className={`feed-rule-content ${card.steps ? "has-steps" : ""}`} data-feed-scroll>
          <span className="feed-category">{copy.play.feedRules}</span>
          <h1>{card.label}</h1><TypedRule text={card.rule} active={flipped} />
          <CardRules card={card} />
        </div>
        <div className="feed-footer">
          {stake && <div className="feed-stake-line"><div className="stake-token read-only"><Icon name="trophy" size={17} /><span>{stake}</span></div>{issueButton}</div>}
          <button className="feed-return" onClick={() => onFlip(false)}><Icon name="restart" size={17} />{copy.play.backToPreview}</button>
          <span className="swipe-tip">{copy.play.swipe}</span>
        </div>
      </div>
    </div></div>
  </article>;
}
