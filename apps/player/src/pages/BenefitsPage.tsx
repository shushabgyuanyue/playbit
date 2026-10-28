import { useCallback, useEffect, useRef, useState } from "react";
import type { Coupon as ApiCoupon } from "@playbit/shared";
import { playerCopy as copy } from "@playbit/content/player";
import { Icon } from "../components/ui/Icon";
import { Sheet } from "../components/ui/Sheet";
import { usePlayer } from "../features/player/PlayerProvider";
import { useLinkSharing } from "../features/player/useLinkSharing";
import { benefitShareData } from "../services/linkSharing";
import { AuthSheet } from "../features/player/AuthSheet";
import { CouponCard } from "../features/benefits/CouponCard";
import { IssueBenefitSheet } from "../features/benefits/IssueBenefitSheet";
import { claimDirectBenefit, createId, issueDirectBenefit, redeemCoupon } from "../features/player/transitions";
import { toPlayerCoupon } from "../features/benefits/couponPresentation";
import type { CouponSource, Signature } from "../data/types";
import { isPlayerApiConfigured, PlayerApiError, playerApi, signatureToDataUrl } from "../services/playerApi";
import { usePageMemory } from "../services/pageMemory";

type RemotePage = { items: ApiCoupon[]; nextCursor: string | null; hasMore: boolean };

function isApiActionError(error: unknown) {
  return error instanceof PlayerApiError && error.status > 0;
}

export function BenefitsPage() {
  const { state, update, notify, auth } = usePlayer();
  const shareLink = useLinkSharing();
  const { memory, remember } = usePageMemory();
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [issuing, setIssuing] = useState(false);
  const [issuanceId, setIssuanceId] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [pendingSelfClaim, setPendingSelfClaim] = useState(false);
  const [issueLoading, setIssueLoading] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);
  const issuingRef = useRef(false);
  const claimingRef = useRef(false);
  const [remote, setRemote] = useState<RemotePage>({ items: [], nextCursor: null, hasMore: false });
  const [remoteMode, setRemoteMode] = useState(false);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [remoteError, setRemoteError] = useState(false);
  const [redeemLoading, setRedeemLoading] = useState(false);
  const section = useRef<HTMLElement>(null);
  const initialScrollTop = useRef(memory.scrollTop.benefits ?? 0);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const remoteLoadingRef = useRef(false);

  useEffect(() => {
    const element = section.current;
    if (!element) return;
    element.scrollTop = initialScrollTop.current;
    const saveScroll = () => remember({ scrollTop: { benefits: element.scrollTop } });
    element.addEventListener("scroll", saveScroll, { passive: true });
    return () => { saveScroll(); element.removeEventListener("scroll", saveScroll); };
  }, [remember]);

  const loadMore = useCallback(async (cursor: string | null = null) => {
    if (!auth.user || remoteLoadingRef.current) return;
    remoteLoadingRef.current = true;
    setRemoteLoading(true);
    setRemoteError(false);
    try {
      const page = await playerApi.listCoupons({ cursor, limit: 10, ownedOnly: true });
      setRemote(current => ({
        items: cursor ? [...current.items, ...page.coupons] : page.coupons,
        nextCursor: page.nextCursor,
        hasMore: page.hasMore
      }));
      setRemoteMode(true);
    } catch (error) {
      setRemoteError(true);
      setRemoteMode(false);
      if (isApiActionError(error)) notify(copy.auth.network);
    } finally {
      remoteLoadingRef.current = false;
      setRemoteLoading(false);
    }
  }, [auth.user, notify]);

  useEffect(() => {
    if (!auth.user || !isPlayerApiConfigured()) {
      setRemote({ items: [], nextCursor: null, hasMore: false });
      setRemoteMode(false);
      return;
    }
    void loadMore();
  }, [auth.user, loadMore]);

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    const scrollHost = section.current;
    if (!sentinel || !scrollHost || !remoteMode) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0]?.isIntersecting && remote.hasMore && !remoteLoading) void loadMore(remote.nextCursor);
    }, { root: scrollHost, rootMargin: "180px 0px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore, remote.hasMore, remote.nextCursor, remoteLoading, remoteMode]);

  const issuance = issuanceId ? state.issuedBenefits[issuanceId] ?? null : null;
  const hasRemoteSession = Boolean(auth.user && isPlayerApiConfigured());
  const displayedCoupons = auth.user
    ? (remoteMode || hasRemoteSession ? remote.items.map(item => toPlayerCoupon(item, state)) : state.coupons)
    : [];
  const remoteById = new Map(remote.items.map(item => [item.id, item]));
  const pendingIssuances = Object.entries(state.issuedBenefits).filter(([, item]) => item.status === "pending_claim").sort((a, b) => Date.parse(b[1].issuedAt) - Date.parse(a[1].issuedAt));

  function openIssuance() {
    notify("");
    setIssuanceId(null);
    setIssuing(true);
  }

  async function issue(title: string, source: CouponSource, sourceNote: string, signature: Signature) {
    if (issuingRef.current) return;
    if (isPlayerApiConfigured()) {
      issuingRef.current = true;
      setIssueLoading(true);
      try {
        const payload = {
          name: title,
          description: sourceNote.trim() || "由签发方提供的 Playbit 权益",
          sourceLabel: source === "game" ? copy.wallet.issueSourceOptions.game : source === "promise" ? copy.wallet.issueSourceOptions.promise : copy.wallet.issueSourceOptions.manual,
          signatureDataUrl: signatureToDataUrl(signature),
          claimLimit: 1
        };
        const result = await playerApi.createPublicCoupon({ ...payload, issuerNickname: state.profileName });
        const remoteIssuance = result.coupon;
        update(current => ({
          ...current,
          issuedBenefits: {
            ...current.issuedBenefits,
            [remoteIssuance.id]: {
              id: remoteIssuance.id,
              remoteId: remoteIssuance.id,
              claimToken: remoteIssuance.claimToken ?? undefined,
              title: remoteIssuance.name,
              issuerName: remoteIssuance.issuerNickname,
              signature,
              issuedAt: remoteIssuance.createdAt,
              source,
              sourceNote,
              status: "pending_claim"
            }
          }
        }));
        setIssuanceId(remoteIssuance.id);
        return;
      } catch (error) {
        notify(isApiActionError(error) ? copy.auth.network : copy.wallet.issueTitle);
        return;
      } finally {
        issuingRef.current = false;
        setIssueLoading(false);
      }
    }
    const id = createId("benefit");
    update(current => issueDirectBenefit(current, title, current.profileName, signature, sourceNote, new Date().toISOString(), id, source));
    setIssuanceId(id);
  }

  async function shareIssuance() {
    await shareLink(benefitShareData(issuance));
  }

  async function selfClaimIssuance(authReady = false) {
    if (!issuance || issuance.status !== "pending_claim" || claimingRef.current) return;
    if (!auth.user && !authReady) { setPendingSelfClaim(true); setAuthOpen(true); return; }
    if (issuance.claimToken && isPlayerApiConfigured()) {
      claimingRef.current = true;
      setClaimLoading(true);
      try {
        const result = await playerApi.claimCoupon(issuance.claimToken);
        setRemote(current => ({ ...current, items: [result.coupon, ...current.items.filter(item => item.id !== result.coupon.id)] }));
        setRemoteMode(true);
      } catch (error) {
        notify(error instanceof PlayerApiError && error.status === 410 ? copy.wallet.claimUnavailable : copy.wallet.claimError);
        return;
      } finally {
        claimingRef.current = false;
        setClaimLoading(false);
      }
    }
    update(current => claimDirectBenefit(current, issuance.id, current.profileName));
    setIssuing(false);
    setIssuanceId(null);
    notify(copy.wallet.issueClaimed);
  }

  async function redeem() {
    if (!redeeming || redeemLoading) return;
    setRedeemLoading(true);
    if (remoteMode) {
      try {
        const result = await playerApi.useCoupon(redeeming);
        setRemote(current => ({ ...current, items: current.items.map(item => item.id === result.coupon.id ? result.coupon : item) }));
        setRedeeming(null);
        notify(copy.wallet.redeemedToast);
      } catch (error) {
        notify(isApiActionError(error) ? copy.wallet.redeemTitle : copy.auth.network);
      } finally {
        setRedeemLoading(false);
      }
      return;
    }
    update(current => redeemCoupon(current, redeeming));
    setRedeeming(null);
    setRedeemLoading(false);
    notify(copy.wallet.redeemedToast);
  }

  return <section className="benefits" ref={section}>
    <div className="module-tag">{copy.wallet.eyebrow}</div><div className="benefit-title"><h1>{copy.wallet.title[0]}<br />{copy.wallet.title[1]}</h1></div>
    {remoteError && <p className="remote-list-note" role="status">{copy.auth.network}</p>}
    {pendingIssuances.length > 0 && <section className="pending-benefits"><h2>{copy.sharing.pendingTitle}</h2>{pendingIssuances.map(([key, item]) => <button type="button" key={key} onClick={() => { setIssuanceId(key); setIssuing(true); }}><Icon name="send" size={16} /><strong>{item.title}</strong><span>{copy.sharing.resume}<Icon name="arrow" size={13} /></span></button>)}</section>}
    {auth.user && <div className="ticket-list ticket-list-won">
      {displayedCoupons.map((coupon, i) => <CouponCard coupon={coupon} index={i} signatureDataUrl={remoteById.get(coupon.id)?.signatureDataUrl} onRedeem={() => { setRedeeming(coupon.id); }} key={coupon.id} />)}
      {!displayedCoupons.length && !remoteLoading && <p className="empty-state">{copy.wallet.empty}</p>}
      <div className="benefits-load-sentinel" ref={loadMoreRef} aria-hidden="true">{remoteMode && remoteLoading && <span className="list-loading-dot" />}</div>
    </div>}
    {!auth.loading && !auth.user && <div className="benefits-guest-state"><span className="benefits-guest-mark"><Icon name="shield" size={19} /></span><strong>{copy.auth.requiredTitle}</strong><p>{copy.auth.requiredHint}</p><button className="text-button" type="button" onClick={() => setAuthOpen(true)}>{copy.auth.login}<Icon name="arrow" size={14} /></button></div>}
    {auth.loading && <div className="benefits-guest-state benefits-loading-state"><span className="list-loading-dot" /><p>{copy.wallet.claimLoading}</p></div>}
    <button className="benefit-issue-fab" type="button" onClick={openIssuance} aria-label={copy.wallet.issueTitle} title={copy.wallet.issueTitle}><Icon name="sign" size={19} /><span className="sr-only">{copy.wallet.issueTitle}</span></button>
    <Sheet open={!!redeeming} onClose={() => { if (!redeemLoading) setRedeeming(null); }} title={copy.wallet.redeemTitle} description={copy.wallet.redeemHint}>
      <div className="sheet-actions"><button className="text-button" onClick={() => setRedeeming(null)} disabled={redeemLoading}>{copy.cancel}</button><button className="primary-button" onClick={() => void redeem()} disabled={redeemLoading}>{redeemLoading ? "正在核销…" : copy.wallet.redeemConfirm}</button></div>
    </Sheet>
    <IssueBenefitSheet open={issuing} onClose={() => { if (!issueLoading && !claimLoading) { setIssuing(false); setIssuanceId(null); } }} issuerName={state.profileName} issuance={issuance} submitting={issueLoading} claiming={claimLoading} onIssue={(title, source, sourceNote, signature) => void issue(title, source, sourceNote, signature)} onShare={() => void shareIssuance()} onSelfClaim={() => void selfClaimIssuance()} />
    <AuthSheet open={authOpen} onClose={() => { setAuthOpen(false); setPendingSelfClaim(false); }} onSuccess={() => { setAuthOpen(false); if (pendingSelfClaim) { setPendingSelfClaim(false); void selfClaimIssuance(true); } }} />
  </section>;
}
