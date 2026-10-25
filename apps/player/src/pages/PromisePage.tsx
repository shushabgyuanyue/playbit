import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { playerCopy as copy } from "@playbit/content/player";
import { Icon } from "../components/ui/Icon";
import { emptyDraft } from "../data/demo";
import type { Party, Signature } from "../data/types";
import { PromiseForm } from "../features/promise/PromiseForm";
import { SigningStep } from "../features/promise/SigningStep";
import { usePlayer } from "../features/player/PlayerProvider";
import { settleAgreement } from "../features/player/transitions";
import { usePageMemory } from "../services/pageMemory";

export function PromisePage() {
  const { state, update, notify } = usePlayer();
  const draft = state.draft;
  const { memory, remember } = usePageMemory();
  const navigate = useNavigate();
  const [stamping, setStamping] = useState(false);
  const [winner, setWinner] = useState<Party | null>(() => draft.step === 2 ? memory.promiseWinner : null);
  const section = useRef<HTMLElement>(null);
  const initialScrollTop = useRef(memory.scrollTop.promise ?? 0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const sealing = useRef(false);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => { remember({ promiseWinner: draft.step === 2 ? winner : null }); }, [draft.step, remember, winner]);
  useEffect(() => {
    const element = section.current;
    if (!element) return;
    element.scrollTop = initialScrollTop.current;
    const saveScroll = () => remember({ scrollTop: { promise: element.scrollTop } });
    element.addEventListener("scroll", saveScroll, { passive: true });
    return () => { saveScroll(); element.removeEventListener("scroll", saveScroll); };
  }, [remember]);
  function change(text: string, benefit: string) { update(current => ({ ...current, draft: { ...current.draft, text, benefit, signatures: { a: [], b: [] } } })); }
  function sign(party: Party, value: Signature) { update(current => ({ ...current, draft: { ...current.draft, signatures: { ...current.draft.signatures, [party]: value } } })); }
  function seal() {
    if (sealing.current || !draft.signatures.a.length || !draft.signatures.b.length) return;
    sealing.current = true; setStamping(true);
    timer.current = setTimeout(() => {
      const id = crypto.randomUUID(); const createdAt = new Date().toISOString();
      update(current => {
        if (current.draft.step !== 1) return current;
        return { ...current, agreements: [{ id, text: current.draft.text.trim(), benefit: current.draft.benefit.trim(), signatures: current.draft.signatures, createdAt, winner: null }, ...current.agreements], draft: { ...current.draft, step: 2, agreementId: id } };
      });
      sealing.current = false; setStamping(false); notify(copy.promise.sealed);
    }, 900);
  }
  function settle() { if (!winner) return; update(current => settleAgreement(current, winner)); notify(`权益已签发给${partyLabel(winner)}`); }
  const partyLabel = (party: Party | null) => party === "a" ? copy.promise.a : copy.promise.b;
  return <section className="bet-module" ref={section}>
    <div className="bet-progress" aria-label={copy.promise.steps[draft.step]}>{copy.promise.steps.map((step, i) => <span className={i <= draft.step ? "active" : ""} key={step} aria-current={i === draft.step ? "step" : undefined}><i>{i < draft.step ? <Icon name="check" size={10} /> : i + 1}</i>{step}</span>)}</div>
    {draft.step === 0 && <div className="page-transition" key="promise-create"><PromiseForm draft={draft} onChange={change} onContinue={() => { if (draft.text.trim() && draft.benefit.trim()) update(current => ({ ...current, draft: { ...current.draft, step: 1 } })); }} /></div>}
    {draft.step === 1 && <div className="page-transition" key="promise-sign"><SigningStep draft={draft} stamping={stamping} onSignature={sign} onSeal={seal} /></div>}
    {draft.step === 2 && <div className="page-transition winner-flow" key="promise-result">
      <div className="ritual-title"><span><Icon name="shield" size={17} /></span><div><small>{copy.promise.resultStep}</small><b>{copy.promise.resultTitle}</b></div></div>
      <div className="active-contract settlement-summary"><span><Icon name="check" size={12} />{copy.promise.active}</span><small>PB-{new Date().getFullYear()}-{draft.agreementId?.slice(0, 4).toUpperCase() ?? "0088"}</small><strong>{draft.text}</strong><p>约定权益：<b>{draft.benefit}</b></p></div>
      <div className="winner-select"><small>{copy.promise.resultLabel}</small><h2>{copy.promise.winnerTitle}</h2><p>{copy.promise.winnerHint}</p><div className="pk-stage professional"><div className="party-choice"><button className={winner === "a" ? "selected" : ""} aria-pressed={winner === "a"} onClick={() => setWinner("a")}><span>甲</span><b>{partyLabel("a")}</b><small>{winner === "a" ? copy.promise.selected : copy.promise.select(partyLabel("a"))}</small></button></div><i>{copy.promise.or}</i><div className="party-choice"><button className={winner === "b" ? "selected" : ""} aria-pressed={winner === "b"} onClick={() => setWinner("b")}><span>乙</span><b>{partyLabel("b")}</b><small>{winner === "b" ? copy.promise.selected : copy.promise.select(partyLabel("b"))}</small></button></div></div></div>
      <button className="contract-cta result-cta" disabled={!winner} onClick={settle}>{winner ? copy.promise.confirmWinner(partyLabel(winner)) : copy.promise.awaiting}<Icon name="gift" /></button>
    </div>}
    {draft.step === 3 && <div className="page-transition issued-flow" key="promise-issued">
      <div className="celebration-field" aria-hidden="true"><i /><i /><i /><i /><i /></div>
      <span className="issued-mark"><Icon name="gift" size={27} /></span><div className="module-tag">{copy.promise.issuedEyebrow}</div><h1>{copy.promise.issuedTitle}<br />{copy.promise.issuedTitleEnd}</h1><p>{copy.promise.issuedHint(partyLabel(draft.winner))}</p>
      <button className="issued-benefit-link" onClick={() => navigate("/benefits")}><article className="coupon-ticket coral-coupon issued-ticket"><div className="ticket-main"><small>{copy.promise.issuedType}</small><strong>{draft.benefit}</strong><span>{copy.promise.viewWallet}</span></div><div className="issued-status"><Icon name="check" size={14} />{copy.promise.issued}</div></article></button>
      <div className="issue-proof"><Icon name="check" size={15} /><span><b>{copy.promise.proof}</b><small>{copy.promise.proofHint}</small></span></div>
      <Link className="view-contract-btn" to={`/agreements/${draft.agreementId}`}><Icon name="file" size={17} /><span><b>{copy.promise.viewDocument}</b><small>{copy.promise.detailHint}</small></span><Icon name="arrow" size={16} /></Link>
      <button className="contract-cta" onClick={() => { update(current => ({ ...current, draft: emptyDraft() })); setWinner(null); }}>{copy.promise.another}<Icon name="arrow" /></button>
    </div>}
  </section>;
}
