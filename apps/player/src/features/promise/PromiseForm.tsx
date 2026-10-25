import { playerCopy as copy } from "@playbit/content/player";
import { Icon } from "../../components/ui/Icon";
import type { PromiseDraft } from "../../data/types";

export function PromiseForm({ draft, onChange, onContinue }: { draft: PromiseDraft; onChange: (text: string, benefit: string) => void; onContinue: () => void }) {
  return <form className="bet-create" onSubmit={e => { e.preventDefault(); onContinue(); }}>
    <div className="ritual-heading"><span><Icon name="file" /></span><div><div className="module-tag">{copy.promise.eyebrow}</div><h1>{copy.promise.title}<br /><em>{copy.promise.titleEnd}</em></h1></div></div>
    <p>{copy.promise.hint}</p>
    <label className="bet-input"><span>{copy.promise.label}</span><textarea value={draft.text} onChange={e => onChange(e.target.value, draft.benefit)} placeholder={copy.promise.placeholder} maxLength={60} required /><small>{draft.text.length}/60</small></label>
    <div className="benefit-picker"><span>{copy.promise.benefit}</span><div>{copy.promise.options.map(option => <button type="button" className={draft.benefit === option ? "selected" : ""} aria-pressed={draft.benefit === option} onClick={() => onChange(draft.text, option)} key={option}>{option}</button>)}</div>
      <label><Icon name="spark" size={15} /><input aria-label={copy.promise.custom} value={copy.promise.options.some(option => option === draft.benefit) ? "" : draft.benefit} onChange={e => onChange(draft.text, e.target.value)} placeholder={copy.promise.custom} maxLength={80} /></label>
    </div>
    <button className="contract-cta" disabled={!draft.text.trim() || !draft.benefit.trim()}>{copy.promise.create}<Icon name="arrow" /></button>
  </form>;
}
