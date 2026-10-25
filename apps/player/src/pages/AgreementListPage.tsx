import { useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { playerCopy as copy } from "@playbit/content/player";
import { Icon } from "../components/ui/Icon";
import { usePlayer } from "../features/player/PlayerProvider";
import { usePageMemory } from "../services/pageMemory";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric" }).format(new Date(value));
}

export function AgreementListPage() {
  const { state } = usePlayer();
  const navigate = useNavigate();
  const { memory, remember } = usePageMemory();
  const section = useRef<HTMLElement>(null);
  const initialScrollTop = useRef(memory.scrollTop.agreements ?? 0);
  const agreements = useMemo(() => [...state.agreements].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)), [state.agreements]);

  useEffect(() => {
    const element = section.current;
    if (!element) return;
    element.scrollTop = initialScrollTop.current;
    const saveScroll = () => remember({ scrollTop: { agreements: element.scrollTop } });
    element.addEventListener("scroll", saveScroll, { passive: true });
    return () => { saveScroll(); element.removeEventListener("scroll", saveScroll); };
  }, [remember]);

  return <section className="agreement-list-page" ref={section}>
    <header className="agreement-list-heading"><div><small>PLAYBIT RECORDS</small><h1>{copy.promise.records}</h1><p>{copy.promise.recordEmpty}</p></div><span className="agreement-list-count">{agreements.length}</span></header>
    {agreements.length > 0 ? <div className="agreement-records">{agreements.map((agreement, index) => <button className="agreement-record" key={agreement.id} onClick={() => navigate(`/agreements/${agreement.id}`)}>
      <span className={`agreement-record-mark mark-${index % 3}`}><Icon name="file" size={17} /></span>
      <span className="agreement-record-copy"><small>{formatDate(agreement.createdAt)} · {agreement.winner ? "已登记结果" : copy.promise.active}</small><b>{agreement.text}</b><span>{copy.promise.benefit}：{agreement.benefit}</span></span>
      <Icon name="arrow" size={16} />
    </button>)}</div> : <div className="agreement-list-empty"><Icon name="file" size={26} /><h2>{copy.promise.noRecords}</h2><p>{copy.promise.recordEmpty}</p><button className="primary-button" onClick={() => navigate("/promise")}>{copy.promise.newPromise}<Icon name="arrow" size={16} /></button></div>}
  </section>;
}
