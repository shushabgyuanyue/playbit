import { useState } from "react";
import { playerCopy as copy } from "@playbit/content/player";
import type { Coupon } from "../../data/types";
import { Icon } from "../../components/ui/Icon";
import { SignatureMark } from "../promise/SignaturePad";
import { CouponVoiceProof } from "./CouponVoiceProof";

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date).replace(/\//g, ".");
}

export function CouponCard({ coupon, index, onRedeem, signatureDataUrl }: { coupon: Coupon; index: number; onRedeem: () => void; signatureDataUrl?: string | null }) {
  const [flipped, setFlipped] = useState(false);
  const number = coupon.displayNo ?? coupon.id.slice(-8).toUpperCase();
  const toggle = () => setFlipped(value => !value);
  return <article className={`coupon-ticket coupon-card ${coupon.tone} ${coupon.status === "redeemed" ? "used" : ""} ${flipped ? "is-flipped" : ""}`} role="button" tabIndex={0} aria-label={`${coupon.title}，${flipped ? copy.wallet.backHint : copy.wallet.flipHint}`} onClick={toggle} onKeyDown={event => { if (event.target !== event.currentTarget) return; if (event.key === "Enter" || event.key === " ") { event.preventDefault(); toggle(); } }}>
    <div className="coupon-flip">
      <div className="coupon-side coupon-front" aria-hidden={flipped} inert={flipped}>
        {coupon.status === "redeemed" && <div className="coupon-used-wash" aria-hidden="true" />}
        <div className="ticket-main">
          <small>{coupon.status === "redeemed" ? `${copy.wallet.used} · ${number}${coupon.redeemedAt ? ` · ${formatDate(coupon.redeemedAt)}` : ""}` : `PLAYBIT · ${number}`}</small>
          <strong>{coupon.title}</strong>
          <span>{coupon.subtitle}</span>
        </div>
        {coupon.status === "redeemed" ? <div className="used-seal"><Icon name="check" size={17} />{copy.wallet.redeemed}</div> : <div className="ticket-actions single"><button type="button" tabIndex={flipped ? -1 : 0} onClick={event => { event.stopPropagation(); onRedeem(); }}><Icon name="check" size={15} />{copy.wallet.redeem}</button><small className="coupon-flip-hint">{copy.wallet.flipHint}</small></div>}
      </div>
      <div className="coupon-side coupon-back" aria-hidden={!flipped} inert={!flipped}>
        <div className="coupon-back-number">PLAYBIT ID · {number}</div>
        {coupon.voice?.assetId ? <><CouponVoiceProof voice={coupon.voice} active={flipped} /><time className="coupon-back-date coupon-audio-date">{formatDate(coupon.issuedAt)}</time></> : <div className="coupon-signature-line">
          <div className="coupon-signature">
            {signatureDataUrl ? <img className="signature-image" src={signatureDataUrl} alt="" /> : coupon.signature?.length ? <SignatureMark value={coupon.signature} /> : <b className="signature-placeholder">{copy.wallet.signatureMissing}</b>}
          </div>
          <time className="coupon-back-date">{formatDate(coupon.issuedAt)}</time>
        </div>}
        <button className="coupon-back-hint" type="button" tabIndex={flipped ? 0 : -1} onClick={event => { event.stopPropagation(); toggle(); }}>{copy.wallet.backHint}<Icon name="arrow" size={13} /></button>
      </div>
    </div>
    <span className="sr-only">{index + 1}</span>
  </article>;
}
