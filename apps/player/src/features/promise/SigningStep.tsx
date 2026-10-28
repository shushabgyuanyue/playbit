import { playerCopy as copy } from "@playbit/content/player";
import { Icon } from "../../components/ui/Icon";
import type { Party, PromiseDraft, Signature } from "../../data/types";
import { SignaturePad } from "./SignaturePad";
import { AgreementCard } from "./AgreementCard";

export function SigningStep({ draft, stamping, onSignature, onSeal }: { draft: PromiseDraft; stamping: boolean; onSignature: (party: Party, value: Signature) => void; onSeal: () => void }) {
  const ready = draft.signatures.a.length > 0 && draft.signatures.b.length > 0;
  return <div className="agreement-signing-flow">
    <div className="agreement-signing-artifact" aria-busy={stamping}>
      <AgreementCard text={draft.text} benefit={draft.benefit} challengeVoice={draft.challengeVoice} benefitVoice={draft.benefitVoice} status={ready ? copy.promise.shareCard.readyToSeal : copy.promise.shareCard.signing}
        signatureArea={<fieldset className="agreement-signatures" disabled={stamping}><legend className="sr-only">{copy.promise.signTitle}</legend><SignaturePad label={copy.promise.signA} value={draft.signatures.a} onChange={value => onSignature("a", value)} /><SignaturePad label={copy.promise.signB} value={draft.signatures.b} onChange={value => onSignature("b", value)} /></fieldset>} />
      {stamping && <div className="contract-seal stamping" aria-hidden="true">PLAYBIT<br />{copy.promise.sealText}</div>}
    </div>
    <div className="agreement-signing-actions"><p>{ready ? copy.promise.signReady : copy.promise.signHint}</p>
      <button className="contract-cta" type="button" disabled={!ready || stamping} onClick={onSeal}>{stamping ? copy.promise.stamping : copy.promise.seal}<Icon name="check" size={18} /></button>
    </div>
  </div>;
}
