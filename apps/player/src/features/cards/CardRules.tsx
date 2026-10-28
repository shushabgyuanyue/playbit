import { Icon } from "../../components/ui/Icon";
import type { GameCard } from "../../data/types";

export function CardRules({ card }: { card: GameCard }) {
  return <>
    {card.steps ? <ol className="feed-steps">{card.steps.map((step, index) => <li key={index}><span aria-hidden="true">{index + 1}</span><p>{step}</p></li>)}</ol>
      : <p className="feed-first-action"><Icon name="arrow" size={17} /><span>{card.action}</span></p>}
    {card.reveal && <details className="feed-answer"><summary>{card.reveal.question}<Icon name="chevronDown" size={16} /></summary><p>{card.reveal.answer}</p></details>}
    {card.note && <p className="feed-boundary">{card.note}</p>}
    {card.sponsor && <p className="feed-boundary">{card.sponsor.disclosure} · {card.sponsor.note}</p>}
  </>;
}
