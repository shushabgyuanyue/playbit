import { useCallback, useEffect, useRef, useState } from "react";
import type { Coupon as ApiCoupon } from "@playbit/shared";
import { playerCopy as copy } from "@playbit/content/player";
import { Icon } from "../components/ui/Icon";
import { Sheet } from "../components/ui/Sheet";
import { usePlayer } from "../features/player/PlayerProvider";
import { AuthSheet } from "../features/player/AuthSheet";
import { CouponCard } from "../features/benefits/CouponCard";
import { IssueBenefitSheet } from "../features/benefits/IssueBenefitSheet";
import { claimDirectBenefit, createId, issueDirectBenefit, redeemCoupon, couponTone } from "../features/player/transitions";
import type { Coupon as PlayerCoupon, CouponSource, Signature } from "../data/types";
import { isPlayerApiConfigured, PlayerApiError, playerApi, signatureToDataUrl } from "../services/playerApi";
import { usePageMemory } from "../services/pageMemory";

type RemotePage = { items: ApiCoupon[]; nextCursor: string | null; hasMore: boolean };

function sourceFor(label: string): CouponSource {
  if (label.includes("游戏")) return "game";
  if (label.includes("赌约") || label.includes("签约")) return "promise";
  return "direct";
}

function toPlayerCoupon(coupon: ApiCoupon): PlayerCoupon {
  const source = sourceFor(coupon.sourceLabel);
  return {
    id: coupon.id,
    displayNo: coupon.id.slice(-8).toUpperCase(),
    title: coupon.name,
    subtitle: coupon.description,
    side: "won",
    tone: couponTone(source),
    status: coupon.status === "used" || coupon.status === "waived" ? "redeemed" : "available",
    source,
    sourceNote: coupon.sourceLabel,
    agreementId: coupon.agreementId ?? undefined,
    issuerName: coupon.issuerNickname,
    holderName: coupon.holderNickname,
    issuedAt: coupon.createdAt,
    redeemedAt: coupon.usedAt ?? undefined
  };
}

function isApiActionError(error: unknown) {
  return error instanceof PlayerApiError && error.status > 0;
}

export function BenefitsPage() {
  const { state, update, notify, auth } = usePlayer();
  const { memory, remember } = usePageMemory();
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [issuing, setIssuing] = useState(false);
  const [issuanceId, setIssuanceId] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
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
    ? (remoteMode || hasRemoteSession ? remote.items.map(toPlayerCoupon) : state.coupons)
    : [];
  const remoteById = new Map(remote.items.map(item => [item.id, item]));

  function openIssuance() {
    notify("");
    setIssuanceId(null);
    setIssuing(true);
  }

  async function issue(title: string, source: CouponSource, sourceNote: string, signature: Signature) {
    if (isPlayerApiConfigured()) {
      try {
        const payload = {
          name: title,
          description: sourceNote.trim() || "由签发方提供的 Playbit 权益",
          sourceLabel: source === "game" ? copy.wallet.issueSourceOptions.game : source === "promise" ? copy.wallet.issueSourceOptions.promise : copy.wallet.issueSourceOptions.manual,
          signatureDataUrl: signatureToDataUrl(signature),
          claimLimit: 1
        };
        const result = await (auth.user
          ? playerApi.createIndependentCoupon(payload)
          : playerApi.createPublicCoupon({ ...payload, issuerNickname: state.profileName }));
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
      }
    }
    const id = createId("benefit");
    update(current => issueDirectBenefit(current, title, current.profileName, signature, sourceNote, new Date().toISOString(), id, source));
    setIssuanceId(id);
  }

  async function shareIssuance() {
    if (!issuance) return;
    const url = issuance.claimToken
      ? `${window.location.origin}/claim/${encodeURIComponent(issuance.claimToken)}`
      : `${window.location.href.split("#")[0]}#benefit=${issuance.id}`;
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
    <IssueBenefitSheet open={issuing} onClose={() => { setIssuing(false); setIssuanceId(null); }} issuerName={state.profileName} issuance={issuance} onIssue={(title, source, sourceNote, signature) => void issue(title, source, sourceNote, signature)} onShare={() => void shareIssuance()} onSelfClaim={selfClaimIssuance} canSelfClaim={!issuance?.claimToken} />
    <AuthSheet open={authOpen} onClose={() => setAuthOpen(false)} onSuccess={() => setAuthOpen(false)} />
  </section>;
}
