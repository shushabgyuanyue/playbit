import { useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { playerCopy as copy } from "@playbit/content/player";
import { Icon } from "../components/ui/Icon";
import { SignatureMark } from "../features/promise/SignaturePad";
import { usePlayer } from "../features/player/PlayerProvider";
import { usePageMemory } from "../services/pageMemory";

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
    const shareData = { title: copy.promise.documentTitle, text: `${record.text} · ${record.benefit}`, url: window.location.href };
    try {
      if (navigator.share) { await navigator.share(shareData); notify(copy.promise.shared); return; }
      if (navigator.clipboard) { await navigator.clipboard.writeText(window.location.href); notify(copy.promise.downloaded); return; }
      notify(copy.promise.shareFailed);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      notify(copy.promise.shareFailed);
    }
  }

  return <section className="contract-detail-page page-transition" ref={section}>
    <header>
      <button className="icon-btn" onClick={() => navigate(-1)} aria-label={copy.back}><Icon name="arrow" /></button>
      <span>{copy.promise.documentTitle}</span>
      <button className="share-contract" onClick={share}>{copy.promise.share}</button>
    </header>
    <div className="official-document">
      <div className="document-authority"><span>PLAYBIT</span><small>{copy.promise.authority}</small></div>
      <h1>{copy.promise.documentTitle}</h1>
      <div className="document-number">{copy.promise.number}{record.id.slice(0, 8).toUpperCase()}</div>
      <div className="party-table"><span>{copy.promise.initiator}<b>{copy.promise.signed}</b></span><span>{copy.promise.counterparty}<b>{copy.promise.signed}</b></span></div>
      <div className="document-body">
        <p>{copy.promise.documentIntro}</p>
        <h2>{copy.promise.clause1}</h2><strong>{record.text}</strong>
        <h2>{copy.promise.clause2}</h2><p>{record.benefit}</p>
        <h2>{copy.promise.clause3}</h2><p>{copy.promise.fulfillment}</p>
        {record.winner && <p>{copy.promise.result(record.winner === "a" ? copy.promise.a : copy.promise.b)}</p>}
      </div>
      <div className="official-signatures">
        <span><i>{copy.promise.signA}</i><SignatureMark value={record.signatures.a} /><small>{copy.promise.signed}</small></span>
        <span><i>{copy.promise.signB}</i><SignatureMark value={record.signatures.b} /><small>{copy.promise.signed}</small></span>
      </div>
      <div className="official-date">{copy.promise.date}{new Date(record.createdAt).toLocaleDateString("zh-CN")}</div>
      <div className="official-seal">PLAYBIT<br /><b>{copy.promise.sealName}</b><small>RECORDED</small></div>
    </div>
    <button className="contract-share-cta" onClick={share}><Icon name="send" size={17} />{copy.promise.shareDocument}</button>
  </section>;
}
