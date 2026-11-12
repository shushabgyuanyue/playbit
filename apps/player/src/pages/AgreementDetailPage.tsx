import { useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { playerCopy as copy } from "@playbit/content/player";
import { Icon } from "../components/ui/Icon";
import { demoVoice } from "../data/demo";
import { AgreementCard } from "../features/promise/AgreementCard";
import { usePlayer } from "../features/player/PlayerProvider";
import { usePageMemory } from "../services/pageMemory";
import { shareAgreementImage } from "../features/promise/agreementShareImage";

export function AgreementDetailPage() {
  const { state, notify } = usePlayer();
  const { memory, remember } = usePageMemory();
  const { agreementId } = useParams();
  const navigate = useNavigate();
  const section = useRef<HTMLElement>(null);
  const initialScrollTop = useRef(memory.scrollTop.agreement ?? 0);
  const agreement = state.agreements.find(item => item.id === agreementId);
  useEffect(() => {
    const element = section.current;
    if (!element) return;
    element.scrollTop = initialScrollTop.current;
    const saveScroll = () => remember({ scrollTop: { agreement: element.scrollTop } });
    element.addEventListener("scroll", saveScroll, { passive: true });
    return () => { saveScroll(); element.removeEventListener("scroll", saveScroll); };
  }, [remember]);
  if (!agreement) return <section className="detail-page empty-detail"><Icon name="file" size={28} /><h1>{copy.promise.missing}</h1><button className="text-button" onClick={() => navigate("/me")}>{copy.promise.returnRecords}</button></section>;
  const record = agreement;
  async function share() {
    try {
      const result = await shareAgreementImage({
        text: record.text,
        createdAt: record.createdAt,
        signatures: record.signatures,
        participantNames: { a: state.profileName, b: copy.promise.shareCard.anonymousCounterparty }
      });
      if (result === "cancelled") return;
      notify(result === "shared" ? copy.promise.shareCard.shareOpened : copy.promise.shareCard.savedCard);
    } catch {
      notify(copy.promise.shareCard.shareImageFailed);
    }
  }

  return <section className="contract-detail-page page-transition" ref={section}>
    <header>
      <button className="icon-btn" onClick={() => navigate(-1)} aria-label={copy.back}><Icon name="arrow" /></button>
      <span>{copy.promise.shareCard.eyebrow}</span>
    </header>
    <div className="agreement-detail-card-wrap">
      <AgreementCard
        text={record.text}
        voice={record.voice ?? demoVoice(record.text, "agreement")}
        status={copy.promise.shareCard.signed}
        participants={[{ role: "initiator", nickname: state.profileName, signed: record.signatures.a.length > 0, signature: record.signatures.a }, { role: "counterparty", nickname: copy.promise.shareCard.anonymousCounterparty, signed: record.signatures.b.length > 0, signature: record.signatures.b }]}
        createdAt={record.createdAt}
      />
    </div>
    <button className="contract-share-cta" onClick={share}><Icon name="share" size={17} />{copy.promise.shareDocument}</button>
  </section>;
}
