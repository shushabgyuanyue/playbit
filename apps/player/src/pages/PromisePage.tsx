import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Agreement as ApiAgreement } from "@playbit/shared";
import { playerCopy as copy } from "@playbit/content/player";
import { Icon } from "../components/ui/Icon";
import { emptyDraft } from "../data/demo";
import type { Party, Signature } from "../data/types";
import { IssueStakeSheet } from "../features/cards/IssueStakeSheet";
import { AuthSheet } from "../features/player/AuthSheet";
import { PromiseForm } from "../features/promise/PromiseForm";
import { SigningStep } from "../features/promise/SigningStep";
import { claimDirectBenefit, issueDirectBenefit } from "../features/player/transitions";
import { usePlayer } from "../features/player/PlayerProvider";
import { usePageMemory } from "../services/pageMemory";
import { isPlayerApiConfigured, PlayerApiError, playerApi, signatureToDataUrl } from "../services/playerApi";

function toLocalAgreement(agreement: ApiAgreement, signatures: Record<Party, Signature>) {
  return {
    id: agreement.id,
    text: agreement.challenge || agreement.title,
    benefit: agreement.stake.label,
    signatures,
    createdAt: agreement.createdAt,
    winner: null as Party | null
  };
}

export function PromisePage() {
  const { state, update, notify, auth } = usePlayer();
  const draft = state.draft;
  const { memory, remember } = usePageMemory();
  const navigate = useNavigate();
  const [stamping, setStamping] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [pendingSignature, setPendingSignature] = useState<Signature | null>(null);
  const [pendingSeal, setPendingSeal] = useState(false);
  const section = useRef<HTMLElement>(null);
  const initialScrollTop = useRef(memory.scrollTop.promise ?? 0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const sealing = useRef(false);
  const sealRequestId = useRef<string | null>(null);
  const agreement = draft.agreementId ? state.agreements.find(item => item.id === draft.agreementId) : null;
  const issuanceId = agreement ? `promise-${agreement.id}` : null;
  const issuance = issuanceId ? state.issuedBenefits[issuanceId] ?? null : null;
  const activeStep = draft.step === 2 && issuance ? 3 : draft.step;

  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    const element = section.current;
    if (!element) return;
    element.scrollTop = initialScrollTop.current;
    const saveScroll = () => remember({ scrollTop: { promise: element.scrollTop } });
    element.addEventListener("scroll", saveScroll, { passive: true });
    return () => { saveScroll(); element.removeEventListener("scroll", saveScroll); };
  }, [remember]);

  function change(text: string, benefit: string) {
    sealRequestId.current = null;
    update(current => ({ ...current, draft: { ...current.draft, text, benefit, signatures: { a: [], b: [] } } }));
  }

  function sign(party: Party, value: Signature) {
    update(current => ({ ...current, draft: { ...current.draft, signatures: { ...current.draft.signatures, [party]: value } } }));
  }

  async function sealAfterAuth(authReady = false) {
    if (sealing.current || !draft.signatures.a.length || !draft.signatures.b.length) return;
    if (isPlayerApiConfigured() && !auth.user && !authReady) {
      setPendingSeal(true);
      setAuthOpen(true);
      return;
    }
    sealing.current = true;
    setStamping(true);
    const signatures = draft.signatures;
    const requestId = sealRequestId.current ?? crypto.randomUUID();
    sealRequestId.current = requestId;
    try {
      await new Promise<void>(resolve => { timer.current = setTimeout(resolve, 900); });
      if (isPlayerApiConfigured()) {
        const result = await playerApi.createOfflineAgreement({
          requestId,
          source: "custom",
          creatorSignatureDataUrl: signatureToDataUrl(signatures.a) ?? "",
          counterpartyNickname: "乙方",
          counterpartySignatureDataUrl: signatureToDataUrl(signatures.b) ?? "",
          title: draft.text.trim(),
          challenge: draft.text.trim(),
          stake: { type: copy.promise.options.some(option => option === draft.benefit) ? "coupon" : "custom", label: draft.benefit.trim(), fulfilled: false, additions: [] }
        });
        update(current => {
          if (current.draft.step !== 1) return current;
          return {
            ...current,
            agreements: [toLocalAgreement(result.agreement, signatures), ...current.agreements.filter(item => item.id !== result.agreement.id)],
            draft: { ...current.draft, step: 2, agreementId: result.agreement.id, winner: null }
          };
        });
      } else {
        const id = crypto.randomUUID();
        const createdAt = new Date().toISOString();
        update(current => {
          if (current.draft.step !== 1) return current;
          return { ...current, agreements: [{ id, text: current.draft.text.trim(), benefit: current.draft.benefit.trim(), signatures: current.draft.signatures, createdAt, winner: null }, ...current.agreements], draft: { ...current.draft, step: 2, agreementId: id, winner: null } };
        });
      }
      sealRequestId.current = null;
      notify(copy.promise.sealed);
    } catch {
      notify(copy.auth.network);
    } finally {
      sealing.current = false;
      setStamping(false);
    }
  }

  function seal() {
    void sealAfterAuth();
  }

  async function persistBenefit(signature: Signature, authReady = false) {
    if (!agreement || issuance || (!auth.user && !authReady)) return;
    const localIssuanceId = `promise-${agreement.id}`;
    if (isPlayerApiConfigured()) {
      try {
        const result = await playerApi.createIndependentCoupon({
          name: agreement.benefit,
          description: agreement.text,
          sourceLabel: copy.wallet.issueSourceOptions.promise,
          signatureDataUrl: signatureToDataUrl(signature),
          claimLimit: 1
        });
        const remoteIssuance = result.coupon;
        update(current => ({
          ...current,
          issuedBenefits: {
            ...current.issuedBenefits,
            [localIssuanceId]: {
              id: localIssuanceId,
              remoteId: remoteIssuance.id,
              claimToken: remoteIssuance.claimToken ?? undefined,
              title: remoteIssuance.name,
              issuerName: remoteIssuance.issuerNickname,
              signature,
              issuedAt: remoteIssuance.createdAt,
              source: "promise",
              sourceNote: agreement.text,
              status: "pending_claim"
            }
          }
        }));
        notify(copy.promise.issueBenefitSigned);
        return;
      } catch (error) {
        notify(error instanceof PlayerApiError && error.status === 0 ? copy.auth.network : copy.promise.issueBenefit);
        return;
      }
    }
    update(current => issueDirectBenefit(current, current.draft.benefit, current.profileName, signature, current.draft.text, new Date().toISOString(), localIssuanceId, "promise"));
    notify(copy.promise.issueBenefitSigned);
  }

  function signBenefit(signature: Signature) {
    if (!agreement || issuance) return;
    if (isPlayerApiConfigured() && !auth.user) {
      setPendingSignature(signature);
      setAuthOpen(true);
      return;
    }
    void persistBenefit(signature);
  }

  async function shareBenefit() {
    if (!issuance) return;
    const url = issuance.claimToken
      ? `${window.location.origin}/claim/${encodeURIComponent(issuance.claimToken)}`
      : `${window.location.href.split("#")[0]}#benefit=${issuance.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: issuance.title, text: `${draft.text} · ${issuance.title}`, url });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      }
      notify(copy.promise.issueBenefitShared);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) notify(copy.promise.issueBenefitShared);
    }
  }

  function selfClaimBenefit() {
    if (!issuance) return;
    update(current => claimDirectBenefit(current, issuance.id, current.profileName));
    setIssueOpen(false);
    navigate("/benefits");
    notify(copy.promise.issueBenefitClaimed);
  }

  const partyLabel = (party: Party | null) => party === "a" ? copy.promise.a : copy.promise.b;
  return <section className="bet-module" ref={section}>
    <div className="bet-progress" aria-label={copy.promise.steps[activeStep]}>{copy.promise.steps.map((step, i) => <span className={i <= activeStep ? "active" : ""} key={step} aria-current={i === activeStep ? "step" : undefined}><i>{i < activeStep ? <Icon name="check" size={10} /> : i + 1}</i>{step}</span>)}</div>
    {draft.step === 0 && <div className="page-transition" key="promise-create"><PromiseForm draft={draft} onChange={change} onContinue={() => { if (draft.text.trim() && draft.benefit.trim()) update(current => ({ ...current, draft: { ...current.draft, step: 1 } })); }} /></div>}
    {draft.step === 1 && <div className="page-transition" key="promise-sign"><SigningStep draft={draft} stamping={stamping} onSignature={sign} onSeal={seal} /></div>}
    {draft.step === 2 && <div className="page-transition settlement-flow" key="promise-settlement">
      <div className="ritual-title"><span><Icon name="shield" size={17} /></span><div><small>{copy.promise.resultStep}</small><b>{copy.promise.resultTitle}</b></div></div>
      <div className="active-contract settlement-summary"><span><Icon name="check" size={12} />{copy.promise.active}</span><small>PB-{new Date().getFullYear()}-{draft.agreementId?.slice(0, 4).toUpperCase() ?? "0088"}</small><strong>{draft.benefit}</strong><p>赌约事项：<b>{draft.text}</b></p></div>
      <div className="settlement-note"><Icon name="send" size={16} /><span><b>{copy.promise.settlementHint}</b><small>签发后分享给赢家登录领取，也可以在本机领取。</small></span></div>
      <button className="contract-cta result-cta" onClick={() => setIssueOpen(true)}><span>{issuance ? copy.promise.issueBenefitShare : copy.promise.issueBenefit}</span><Icon name="gift" /></button>
      <Link className="view-contract-btn" to={`/agreements/${draft.agreementId}`}><Icon name="file" size={17} /><span><b>{copy.promise.viewDocument}</b><small>{copy.promise.detailHint}</small></span><Icon name="arrow" size={16} /></Link>
    </div>}
    {draft.step === 3 && <div className="page-transition issued-flow" key="promise-issued">
      <div className="celebration-field" aria-hidden="true"><i /><i /><i /><i /><i /></div>
      <span className="issued-mark"><Icon name="gift" size={27} /></span><div className="module-tag">{copy.promise.issuedEyebrow}</div><h1>{copy.promise.issuedTitle}<br />{copy.promise.issuedTitleEnd}</h1><p>{copy.promise.issuedHint(partyLabel(draft.winner))}</p>
      <Link className="view-contract-btn" to={`/agreements/${draft.agreementId}`}><Icon name="file" size={17} /><span><b>{copy.promise.viewDocument}</b><small>{copy.promise.detailHint}</small></span><Icon name="arrow" size={16} /></Link>
      <button className="contract-cta" onClick={() => { update(current => ({ ...current, draft: emptyDraft() })); }}>{copy.promise.another}<Icon name="arrow" /></button>
    </div>}
    {agreement && <IssueStakeSheet open={issueOpen} onClose={() => setIssueOpen(false)} cardTitle={agreement.text} stake={agreement.benefit} issuerName={state.profileName} issuance={issuance} onIssue={signBenefit} onShare={() => void shareBenefit()} onSelfClaim={selfClaimBenefit} canSelfClaim={!issuance?.claimToken} labels={{ title: copy.promise.issueBenefitTitle, eyebrow: "AGREEMENT BENEFIT", description: copy.promise.issueBenefitHint, issue: copy.promise.issueBenefit, pending: copy.promise.issueBenefitPending, sign: copy.play.issueStakeSign, signHint: copy.play.issueStakeSignHint, action: copy.play.issueStakeAction, signed: copy.promise.issueBenefitSigned, claimed: copy.promise.issueBenefitClaimed, share: copy.promise.issueBenefitShare, selfClaim: copy.promise.issueBenefitSelfClaim }} />}
    <AuthSheet open={authOpen} onClose={() => { setAuthOpen(false); setPendingSignature(null); setPendingSeal(false); }} onSuccess={() => { const signature = pendingSignature; const shouldSeal = pendingSeal; setPendingSignature(null); setPendingSeal(false); if (signature) void persistBenefit(signature, true); else if (shouldSeal) void sealAfterAuth(true); }} />
  </section>;
}
