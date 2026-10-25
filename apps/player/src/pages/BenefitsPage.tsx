import { useEffect, useRef, useState } from "react";
import { playerCopy as copy } from "@playbit/content/player";
import { Icon } from "../components/ui/Icon";
import { Sheet } from "../components/ui/Sheet";
import { usePlayer } from "../features/player/PlayerProvider";
import { CouponCard } from "../features/benefits/CouponCard";
import { IssueBenefitSheet } from "../features/benefits/IssueBenefitSheet";
import { claimDirectBenefit, createId, issueDirectBenefit, redeemCoupon } from "../features/player/transitions";
import { usePageMemory } from "../services/pageMemory";

export function BenefitsPage() {
  const { state, update, notify } = usePlayer();
  const { memory, remember } = usePageMemory();
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [issuing, setIssuing] = useState(false);
  const [issuanceId, setIssuanceId] = useState<string | null>(null);
  const section = useRef<HTMLElement>(null);
  const initialScrollTop = useRef(memory.scrollTop.benefits ?? 0);
  useEffect(() => {
    const element = section.current;
    if (!element) return;
    element.scrollTop = initialScrollTop.current;
    const saveScroll = () => remember({ scrollTop: { benefits: element.scrollTop } });
    element.addEventListener("scroll", saveScroll, { passive: true });
    return () => { saveScroll(); element.removeEventListener("scroll", saveScroll); };
  }, [remember]);
  const issuance = issuanceId ? state.issuedBenefits[issuanceId] ?? null : null;
  function openIssuance() {
    notify("");
    setIssuanceId(null);
    setIssuing(true);
  }
  function issue(title: string, sourceNote: string, signature: Parameters<typeof issueDirectBenefit>[3]) {
    const id = createId("benefit");
    update(current => issueDirectBenefit(current, title, current.profileName, signature, sourceNote, new Date().toISOString(), id));
    setIssuanceId(id);
    notify(copy.wallet.issueCreated);
  }
  async function shareIssuance() {
    if (!issuance) return;
    const url = `${window.location.href.split("#")[0]}#benefit=${issuance.id}`;
    try {
      if (navigator.share) await navigator.share({ title: issuance.title, text: `一份给你的权益：${issuance.title}`, url });
      else if (navigator.clipboard) await navigator.clipboard.writeText(url);
      notify(copy.wallet.issueShared);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) notify(copy.wallet.issueShared);
    }
  }
  function selfClaimIssuance() {
    if (!issuance) return;
    update(current => claimDirectBenefit(current, issuance.id, current.profileName));
    setIssuing(false);
    setIssuanceId(null);
    notify(copy.wallet.issueClaimed);
  }
  return <section className="benefits" ref={section}>
    <div className="module-tag">{copy.wallet.eyebrow}</div><div className="benefit-title"><h1>{copy.wallet.title[0]}<br />{copy.wallet.title[1]}</h1></div>
    <div className="ticket-list ticket-list-won">
      {state.coupons.map((coupon, i) => <CouponCard coupon={coupon} index={i} onRedeem={() => setRedeeming(coupon.id)} key={coupon.id} />)}
      {!state.coupons.length && <p className="empty-state">{copy.wallet.empty}</p>}
    </div>
    <button className="benefit-issue-fab" type="button" onClick={openIssuance} aria-label={copy.wallet.issueTitle} title={copy.wallet.issueTitle}><Icon name="sign" size={19} /><span className="sr-only">{copy.wallet.issueTitle}</span></button>
    <Sheet open={!!redeeming} onClose={() => setRedeeming(null)} title={copy.wallet.redeemTitle} description={copy.wallet.redeemHint}>
      <div className="sheet-actions"><button className="text-button" onClick={() => setRedeeming(null)}>{copy.cancel}</button><button className="primary-button" onClick={() => { if (redeeming) update(current => redeemCoupon(current, redeeming)); setRedeeming(null); notify(copy.wallet.redeemedToast); }}>{copy.wallet.redeemConfirm}</button></div>
    </Sheet>
    <IssueBenefitSheet open={issuing} onClose={() => { setIssuing(false); setIssuanceId(null); }} issuerName={state.profileName} issuance={issuance} onIssue={issue} onShare={() => void shareIssuance()} onSelfClaim={selfClaimIssuance} />
  </section>;
}
