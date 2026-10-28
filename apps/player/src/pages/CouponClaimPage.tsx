import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Coupon } from "@playbit/shared";
import { playerCopy as copy } from "@playbit/content/player";
import { Icon } from "../components/ui/Icon";
import { PageBack } from "../components/ui/PageBack";
import { AuthSheet } from "../features/player/AuthSheet";
import { usePlayer } from "../features/player/PlayerProvider";
import { PlayerApiError, playerApi } from "../services/playerApi";

export function CouponClaimPage() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const { auth, notify } = usePlayer();
  const [coupon, setCoupon] = useState<Pick<Coupon, "name" | "description" | "sourceLabel" | "issuerNickname" | "transferNote" | "status" | "createdAt" | "claimLimit" | "claimedCount" | "remainingClaims"> | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const claimingRef = useRef(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [claimAfterAuth, setClaimAfterAuth] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void playerApi.getCouponShare(token).then(result => {
      if (!cancelled) setCoupon(result.coupon);
    }).catch(cause => {
      if (!cancelled) setError(cause instanceof PlayerApiError && cause.status === 410 ? copy.wallet.claimUnavailable : copy.wallet.claimError);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [token]);

  async function claim(authReady = false) {
    if (!token || claimingRef.current) return;
    if (!auth.user && !authReady) {
      setClaimAfterAuth(true);
      setAuthOpen(true);
      return;
    }
    claimingRef.current = true;
    setClaiming(true);
    setError("");
    try {
      await playerApi.claimCoupon(token);
      notify(copy.wallet.claimSuccess);
      navigate("/benefits");
    } catch (cause) {
      setError(cause instanceof PlayerApiError && cause.status === 410 ? copy.wallet.claimUnavailable : copy.wallet.claimError);
    } finally {
      claimingRef.current = false;
      setClaiming(false);
    }
  }

  return <section className="claim-page">
    <PageBack fallback="/" />
    {loading && <div className="claim-state"><span className="list-loading-dot" /><p>{copy.wallet.claimLoading}</p></div>}
    {!loading && coupon && !error && <div className="claim-ticket-wrap">
      <div className="module-tag">{copy.wallet.claimEyebrow}</div>
      <div className="claim-heading"><h1>{copy.wallet.claimTitle}</h1><p>{copy.wallet.claimHint}</p></div>
      <article className="claim-ticket coral-coupon">
        <div className="claim-ticket-top"><small>{coupon.sourceLabel}</small><Icon name="gift" size={20} /></div>
        <strong>{coupon.name}</strong>
        <p>{coupon.description}</p>
        <div className="claim-ticket-meta"><span>{copy.wallet.claimIssuer(coupon.issuerNickname)}</span><span>{copy.wallet.claimRemaining(coupon.remainingClaims)}</span></div>
        {coupon.transferNote && <small className="claim-ticket-note">{coupon.transferNote}</small>}
      </article>
      <button className="primary-button claim-action" type="button" onClick={() => void claim()} disabled={claiming}>{claiming ? "正在领取…" : auth.user ? copy.wallet.claimAction : copy.wallet.claimLogin}<Icon name="arrow" size={16} /></button>
      <button className="text-button" type="button" onClick={() => navigate("/")}>先回去玩一局</button>
    </div>}
    {!loading && error && <div className="claim-state claim-error"><Icon name="alert" size={24} /><strong>{error}</strong><button className="text-button" type="button" onClick={() => navigate("/")}>回到 Playbit</button></div>}
    <AuthSheet open={authOpen} onClose={() => { setAuthOpen(false); setClaimAfterAuth(false); }} onSuccess={() => { if (claimAfterAuth) { setClaimAfterAuth(false); void claim(true); } }} />
  </section>;
}
