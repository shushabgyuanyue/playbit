import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  const [pendingSeal, setPendingSeal] = useState(false);
  const [pendingSelfClaim, setPendingSelfClaim] = useState(false);
  const section = useRef<HTMLElement>(null);
  const initialScrollTop = useRef(memory.scrollTop.promise ?? 0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const sealing = useRef(false);
  const sealRequestId = useRef<string | null>(null);
  const agreement = draft.agreementId ? state.agreements.find(item => item.id === draft.agreementId) : null;
  const issuanceId = agreement ? `promise-${agreement.id}` : null;
  const issuance = issuanceId ? state.issuedBenefits[issuanceId] ?? null : null;
  // Offline signing keeps settlement and benefit issuance as two separate steps.
  // Older saved sessions with an issued benefit are rendered in the issuance step.
  const flowStep = draft.step === 2 && issuance ? 3 : draft.step;
  const activeStep = Math.min(flowStep, 3);

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

  function openWallet() {
    navigate("/benefits", { state: { returnTo: "/promise" } });
  }

  function startIssuance() {
    update(current => ({ ...current, draft: { ...current.draft, step: 3 } }));
    setIssueOpen(true);
  }

  function startNewPromise() {
    update(current => ({ ...current, draft: emptyDraft() }));
    navigate("/promise");
  }

  async function persistBenefit(signature: Signature) {
    if (!agreement || issuance) return;
    const localIssuanceId = `promise-${agreement.id}`;
    if (isPlayerApiConfigured()) {
      try {
        const result = await playerApi.createPublicCoupon({
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
          },
          draft: { ...current.draft, step: 3 }
        }));
        notify(copy.promise.issueBenefitSigned);
        return;
      } catch (error) {
        notify(error instanceof PlayerApiError && error.status === 0 ? copy.auth.network : copy.promise.issueBenefit);
        return;
      }
    }
    update(current => ({ ...issueDirectBenefit(current, current.draft.benefit, current.profileName, signature, current.draft.text, new Date().toISOString(), localIssuanceId, "promise"), draft: { ...current.draft, step: 3 } }));
    notify(copy.promise.issueBenefitSigned);
  }

  function signBenefit(signature: Signature) {
    if (!agreement || issuance) return;
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

  async function selfClaimBenefit(authReady = false) {
    if (!issuance) return;
    if (issuance.claimToken && isPlayerApiConfigured()) {
      if (!auth.user && !authReady) {
        setPendingSelfClaim(true);
        setAuthOpen(true);
        return;
      }
      try {
        await playerApi.claimCoupon(issuance.claimToken);
        update(current => ({ ...claimDirectBenefit(current, issuance.id, current.profileName), draft: { ...current.draft, step: 3 } }));
        setIssueOpen(false);
        notify(copy.promise.issueBenefitClaimed);
      } catch (error) {
        notify(error instanceof PlayerApiError && error.status === 0 ? copy.auth.network : copy.wallet.claimError);
      }
      return;
    }
    update(current => ({ ...claimDirectBenefit(current, issuance.id, current.profileName), draft: { ...current.draft, step: 3 } }));
    setIssueOpen(false);
    notify(copy.promise.issueBenefitClaimed);
  }

  return <section className="bet-module" ref={section}>
    <div className="bet-progress" aria-label={copy.promise.steps[activeStep]}>{copy.promise.steps.map((step, i) => <span className={i <= activeStep ? "active" : ""} key={step} aria-current={i === activeStep ? "step" : undefined}><i>{i < activeStep ? <Icon name="check" size={10} /> : i + 1}</i>{step}</span>)}</div>
    {flowStep === 0 && <div className="page-transition" key="promise-create"><PromiseForm draft={draft} onChange={change} onContinue={() => { if (draft.text.trim() && draft.benefit.trim()) update(current => ({ ...current, draft: { ...current.draft, step: 1 } })); }} /></div>}
    {flowStep === 1 && <div className="page-transition" key="promise-sign"><SigningStep draft={draft} stamping={stamping} onSignature={sign} onSeal={seal} /></div>}
    {flowStep === 2 && <div className="page-transition settlement-flow" key="promise-settlement">
      <div className="ritual-title"><span><Icon name="shield" size={17} /></span><div><small>{copy.promise.resultStep}</small><b>{copy.promise.resultTitle}</b></div></div>
      <div className="active-contract settlement-summary"><span><Icon name="check" size={12} />{copy.promise.active}</span><small>PB-{new Date().getFullYear()}-{draft.agreementId?.slice(0, 4).toUpperCase() ?? "0088"}</small><strong>{draft.benefit}</strong><p>赌约事项：<b>{draft.text}</b></p></div>
      <button className="contract-cta result-cta" onClick={startIssuance}><span>{copy.promise.goToIssuance}</span><Icon name="gift" /></button>
    </div>}
    {flowStep === 3 && <div className="page-transition issued-flow settlement-complete-flow" key="promise-issued">
      <div className="celebration-field" aria-hidden="true"><i /><i /><i /><i /><i /></div>
      <span className="issued-mark"><Icon name={issuance ? "check" : "gift"} size={27} /></span>
      <div className="module-tag">{issuance ? copy.promise.issuedEyebrow : copy.promise.resultLabel}</div>
      <h1>{!issuance ? copy.promise.issueBenefitTitle : issuance.status === "claimed" ? copy.promise.issuedClaimedTitle : copy.promise.issuedTitle}<br />{!issuance ? copy.promise.issueBenefitTitleEnd : issuance.status === "claimed" ? copy.promise.issuedClaimedTitleEnd : copy.promise.issuedTitleEnd}</h1>
      <p>{!issuance ? copy.promise.issueBenefitHint : issuance.status === "claimed" ? copy.promise.issueBenefitClaimed : copy.promise.issueBenefitPending}</p>
      {issuance && <div className="settlement-benefit-proof">
        <span><Icon name="gift" size={18} /></span>
        <div><small>{copy.promise.issuedType}</small><strong>{issuance.title}</strong></div>
        <button type="button" onClick={openWallet} aria-label={copy.promise.viewWallet}><Icon name="arrow" size={17} /></button>
      </div>}
      {!issuance && <button className="contract-cta issued-share-cta" onClick={() => setIssueOpen(true)}><span>{copy.promise.issueBenefit}</span><Icon name="gift" /></button>}
      {issuance && issuance.status !== "claimed" && <button className="contract-cta issued-share-cta" onClick={() => setIssueOpen(true)}><span>{copy.promise.issueBenefitShare}</span><Icon name="send" /></button>}
      {issuance?.status === "claimed" && <button className="contract-cta issued-share-cta" onClick={openWallet}><span>{copy.promise.viewWallet}</span><Icon name="arrow" /></button>}
      <button className="issued-new-promise" type="button" onClick={startNewPromise}><Icon name="edit" size={14} />{copy.promise.newPromise}</button>
    </div>}
    {agreement && <IssueStakeSheet open={issueOpen} onClose={() => setIssueOpen(false)} cardTitle={agreement.text} stake={agreement.benefit} issuerName={state.profileName} issuance={issuance} onIssue={signBenefit} onShare={() => void shareBenefit()} onSelfClaim={() => void selfClaimBenefit()} canSelfClaim labels={{ title: copy.promise.issueBenefitTitle, eyebrow: "AGREEMENT BENEFIT", description: copy.promise.issueBenefitHint, issue: copy.promise.issueBenefit, pending: copy.promise.issueBenefitPending, sign: copy.play.issueStakeSign, signHint: copy.play.issueStakeSignHint, action: copy.play.issueStakeAction, signed: copy.promise.issueBenefitSigned, claimed: copy.promise.issueBenefitClaimed, share: copy.promise.issueBenefitShare, selfClaim: copy.promise.issueBenefitSelfClaim }} />}
    <AuthSheet open={authOpen} onClose={() => { setAuthOpen(false); setPendingSeal(false); setPendingSelfClaim(false); }} onSuccess={() => { const shouldSeal = pendingSeal; const shouldSelfClaim = pendingSelfClaim; setPendingSeal(false); setPendingSelfClaim(false); if (shouldSeal) void sealAfterAuth(true); if (shouldSelfClaim) void selfClaimBenefit(true); }} />
  </section>;
}
