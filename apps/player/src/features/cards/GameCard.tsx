import { useEffect, useState } from "react";
import { playerCopy as copy } from "@playbit/content/player";
import { Icon } from "../../components/ui/Icon";
import type { GameCard as Card } from "../../data/types";

function TypedRule({ text }: { text: string }) {
  const [typed, setTyped] = useState("");
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setTyped(text); return; }
    let cursor = 0; setTyped("");
    const timer = setInterval(() => { cursor += 1; setTyped(text.slice(0, cursor)); if (cursor >= text.length) clearInterval(timer); }, 58);
    return () => clearInterval(timer);
  }, [text]);
  return <p className="rule type-rule"><span className="sr-only">{text}</span><span aria-hidden="true">{typed}<i className="type-caret" /></span></p>;
}

export function GameCard({ card, scene, flipped, slide, saved, stake, stakeIssued, onFlip, onSave, onStake, onIssue }: {
  card: Card; scene: string; flipped: boolean; slide: string; saved: boolean; stake?: string; stakeIssued?: boolean;
  onFlip: (value: boolean) => void; onSave: () => void; onStake: () => void; onIssue: () => void;
}) {
  const [initial, setInitial] = useState(true);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setInitial(false));
    return () => window.cancelAnimationFrame(frame);
  }, []);
  return <article className={`game-card ${card.color} ${flipped ? "is-flipped" : ""} ${slide}`} data-card-id={card.id}>
    <div className={`game-card-motion ${initial ? "is-initial" : ""}`}>
      <div className="card-inner">
      <div className="card-face card-front" inert={flipped} aria-hidden={flipped}>
        <div className="network-field" aria-hidden="true">
          <i className="ambient-one" />
          <i className="ambient-two" />
          <i className="ambient-ring" />
        </div>
        <div className="post-author"><span className="author-mark">PB</span><span><b>{copy.play.author}</b><small>{copy.play.justNow} · {scene}</small></span><i><span className="live-pulse" />{copy.play.happening}</i></div>
        <button className={`corner-save ${saved ? "saved" : ""}`} onClick={onSave} aria-label={copy.play.collect} aria-pressed={saved}><Icon name="bookmark" size={18} /></button>
        <div className="prompt"><span className="prompt-eyebrow"><b>{card.label}</b>{copy.play.turn}</span><p>{card.prompt}</p><strong>{card.kicker}</strong></div>
        <div className="share-message"><div className="share-message-head"><span>{copy.play.payoff}</span><i />{stake && <button className={`stake-issue-icon ${stakeIssued ? "issued" : ""}`} type="button" onClick={onIssue} aria-label={stakeIssued ? copy.play.issueStakeSigned : copy.play.issueStake} title={stakeIssued ? copy.play.issueStakeSigned : copy.play.issueStake}><Icon name={stakeIssued ? "check" : "sign"} size={15} /></button>}</div><b>{card.payoff}</b><small>{copy.play.quote}</small></div>
        <div className="share-meta"><span className="playing-now"><i className="avatar-stack"><b>林</b><b>J</b><b>+</b></i><em>{copy.play.answers}</em></span><span className="moment-chip"><i className="live-pulse" />{card.moment}</span></div>
        <div className="card-actions">
          <button className={`stake-btn preview-stake ${stake ? "on" : ""}`} onClick={onStake}><span className={`stake-add ${stake ? "awarded" : ""}`}>{stake ? <Icon name="trophy" size={19} /> : "＋"}</span><span className="stake-copy"><b>{stake ? copy.play.stakeAdded : copy.play.stake}</b><small>{stake ?? copy.play.anticipation}</small></span></button>
          <button className="flip-btn" onClick={() => onFlip(true)}>{copy.play.flip}<Icon name="arrow" size={19} /></button>
        </div>
        <span className="swipe-tip">{copy.play.swipe}</span>
      </div>
      <div className="card-face card-back" inert={!flipped} aria-hidden={!flipped} onClick={e => { if (!(e.target as HTMLElement).closest("button, .stake-token.read-only")) onFlip(false); }}>
        <div className="play-state"><span>{copy.play.serious}</span><b>{card.time}</b></div>
        <button className={`corner-save light ${saved ? "saved" : ""}`} onClick={onSave} aria-label={copy.play.collect} aria-pressed={saved}><Icon name="bookmark" size={18} /></button>
        <div className="type-stage"><div className="rule-kicker">{copy.play.rules}</div>{flipped && <TypedRule text={card.rule} />}<span className="type-note">{card.action}{copy.play.putDown}</span></div>
        <div className="stake-token-row">
          <div className="stake-token minimal read-only" aria-label={stake ? copy.play.stakeAdded : copy.play.stake} title={stake ? copy.play.stakeAdded : copy.play.stake}><span className="stake-trophy"><Icon name="trophy" size={14} /></span><span>{stake ? copy.play.stakeAdded : copy.play.stake}</span><b>{stake ?? copy.play.anticipation}</b></div>
          {stake && <button className={`stake-issue-icon back ${stakeIssued ? "issued" : ""}`} type="button" onClick={onIssue} aria-label={stakeIssued ? copy.play.issueStakeSigned : copy.play.issueStake} title={stakeIssued ? copy.play.issueStakeSigned : copy.play.issueStake}><Icon name={stakeIssued ? "check" : "sign"} size={14} /></button>}
        </div>
        <button className="swipe-tip back-hint" onClick={() => onFlip(false)} aria-label={copy.play.backToPreview}>{copy.play.returnHint}</button>
      </div>
      </div>
    </div>
  </article>;
}
