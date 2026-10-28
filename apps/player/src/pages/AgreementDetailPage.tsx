import { useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { playerCopy as copy } from "@playbit/content/player";
import { Icon } from "../components/ui/Icon";
import { demoVoice } from "../data/demo";
import { AgreementCard } from "../features/promise/AgreementCard";
import { usePlayer } from "../features/player/PlayerProvider";
import { usePageMemory } from "../services/pageMemory";
import { useLinkSharing } from "../features/player/useLinkSharing";

export function AgreementDetailPage() {
  const { state } = usePlayer();
  const shareLink = useLinkSharing();
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
  const shareUrl = `${window.location.origin}/share/${encodeURIComponent(record.shareCode ?? record.id)}`;

  async function share() {
    const shareData = { title: copy.promise.documentTitle, text: `${record.text} · ${record.benefit}`, url: shareUrl };
    await shareLink(shareData);
  }

  return <section className="contract-detail-page page-transition" ref={section}>
    <header>
      <button className="icon-btn" onClick={() => navigate(-1)} aria-label={copy.back}><Icon name="arrow" /></button>
      <span>{copy.promise.shareCard.eyebrow}</span>
    </header>
    <div className="agreement-detail-card-wrap">
      <AgreementCard
        text={record.text}
        benefit={record.benefit}
        challengeVoice={record.challengeVoice ?? demoVoice(record.text, "challenge")}
        benefitVoice={record.benefitVoice ?? demoVoice(record.benefit, "benefit")}
        status={copy.promise.shareCard.signed}
        participants={[{ role: "initiator", nickname: state.profileName, signed: record.signatures.a.length > 0, signature: record.signatures.a }, { role: "counterparty", nickname: copy.promise.b, signed: record.signatures.b.length > 0, signature: record.signatures.b }]}
        code={record.shareCode ?? record.id}
        createdAt={record.createdAt}
      />
    </div>
    <button className="contract-share-cta" onClick={share}><Icon name="share" size={17} />{copy.promise.shareDocument}</button>
  </section>;
}
