import { playerCopy as copy } from "@playbit/content/player";
import { Icon } from "../../components/ui/Icon";
import type { PromiseDraft } from "../../data/types";
import { VoiceAgreementEditor } from "./VoiceAgreementEditor";

export function PromiseForm({ draft, onContinue }: { draft: PromiseDraft; onContinue: () => void }) {
  const ready = Boolean(draft.voice.assetId);
  return <form className="bet-create" onSubmit={e => { e.preventDefault(); if (ready) onContinue(); }}>
    <VoiceAgreementEditor draft={draft} />
    <button className="contract-cta" disabled={!ready}>{copy.promise.create}<Icon name="arrow" /></button>
  </form>;
}
