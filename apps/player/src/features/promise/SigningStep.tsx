import { playerCopy as copy } from "@playbit/content/player";
import { Icon } from "../../components/ui/Icon";
import type { Party, PromiseDraft, Signature } from "../../data/types";
import { SignaturePad } from "./SignaturePad";

export function SigningStep({ draft, stamping, onSignature, onSeal }: { draft: PromiseDraft; stamping: boolean; onSignature: (party: Party, value: Signature) => void; onSeal: () => void }) {
  const ready = draft.signatures.a.length > 0 && draft.signatures.b.length > 0;
  return <div className="contract-flow">
    <div className="ritual-title"><span><Icon name="file" size={17} /></span><div><small>{copy.promise.signStep}</small><b>{copy.promise.signTitle}</b></div></div>
    <div className="formal-contract"><div className="contract-emblem"><Icon name="seal" size={17} /></div>
      <div className="formal-head"><span>{copy.promise.lab}</span><b>{copy.promise.document}</b><small>NO. PB-2026-0088</small></div>
      <div className="contract-copy"><small>{copy.promise.intro}</small><strong>{draft.text}</strong><p>{copy.promise.terms(draft.benefit)}</p></div>
      <div className="signature-grid"><SignaturePad label={copy.promise.signA} value={draft.signatures.a} onChange={value => onSignature("a", value)} /><SignaturePad label={copy.promise.signB} value={draft.signatures.b} onChange={value => onSignature("b", value)} /></div>
      {stamping && <div className="contract-seal stamping">PLAYBIT<br />{copy.promise.sealText}</div>}
    </div>
    <p className="sign-hint">{ready ? copy.promise.signReady : copy.promise.signHint}</p>
    <button className="contract-cta seal-cta" disabled={!ready || stamping} onClick={onSeal}>{stamping ? copy.promise.stamping : copy.promise.seal}<Icon name="check" /></button>
  </div>;
}
