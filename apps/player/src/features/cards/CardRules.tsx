import { useEffect, useState } from "react";
import { playerCopy as copy } from "@playbit/content/player";
import { Icon } from "../../components/ui/Icon";
import type { GameCard } from "../../data/types";

export function CardRules({ card }: { card: GameCard }) {
  const [stage, setStage] = useState<"rule" | "countdown" | "result">("rule");
  const [remaining, setRemaining] = useState(card.flow?.countdownSeconds ?? 0);
  useEffect(() => {
    setStage("rule");
    setRemaining(card.flow?.countdownSeconds ?? 0);
  }, [card.id, card.flow?.countdownSeconds]);
  useEffect(() => {
    if (stage !== "countdown") return;
    const timer = window.setInterval(() => {
      setRemaining(value => {
        if (value <= 1) {
          window.clearInterval(timer);
          setStage("result");
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [stage]);
  if (stage === "result") {
    return <div className="feed-result" aria-live="polite"><span className="feed-result-mark"><Icon name="check" size={16} /></span><p>{card.flow?.result ?? copy.play.countdownResult}</p></div>;
  }
  return <>
    {stage === "countdown" ? <div className="feed-countdown" aria-live="polite"><span>{copy.play.countdownRemaining}</span><strong>{remaining}</strong><small>{copy.play.countdownSeconds}</small></div>
      : <p className="feed-action-line">{card.action}</p>}
    {stage === "rule" && card.flow?.countdownSeconds && <button className="feed-clock" type="button" onClick={() => { setRemaining(card.flow?.countdownSeconds ?? 0); setStage("countdown"); }}><Icon name="clock" size={16} /><span>{copy.play.clockStart}</span><strong>{card.flow.countdownSeconds}″</strong></button>}
    {card.reveal && <details className="feed-answer"><summary>{card.reveal.question}<Icon name="chevronDown" size={16} /></summary><p>{card.reveal.answer}</p></details>}
  </>;
}
