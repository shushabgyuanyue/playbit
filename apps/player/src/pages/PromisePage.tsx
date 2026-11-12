import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Agreement as ApiAgreement, AgreementVoice } from "@playbit/shared";
import { playerCopy as copy } from "@playbit/content/player";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { Icon } from "../components/ui/Icon";
import { emptyDraft } from "../data/demo";
import type { Party, Signature, VoiceNote } from "../data/types";
import { AuthSheet } from "../features/player/AuthSheet";
import { PromiseForm } from "../features/promise/PromiseForm";
import { PromiseProgress } from "../features/promise/PromiseProgress";
import { SigningStep } from "../features/promise/SigningStep";
import { AgreementCard } from "../features/promise/AgreementCard";
import { BenefitShareCard } from "../features/benefits/BenefitShareCard";
import { shareAgreementImage } from "../features/promise/agreementShareImage";
import { claimDirectBenefit, issueDirectBenefit } from "../features/player/transitions";
import { usePlayer } from "../features/player/PlayerProvider";
import { useLinkSharing } from "../features/player/useLinkSharing";
import { benefitShareData } from "../services/linkSharing";
import { usePageMemory } from "../services/pageMemory";
import { isPlayerApiConfigured, normalizeCouponDescription, normalizeCouponName, PlayerApiError, playerApi, signatureToDataUrl } from "../services/playerApi";
import { deleteVoiceAsset } from "../services/voiceRepository";

function toAgreementVoice(voice: VoiceNote): AgreementVoice {
  return voice.assetId ? {
    transcript: voice.transcript?.trim() || null,
    durationMs: voice.durationMs,
    mimeType: voice.mimeType ?? null,
    byteLength: voice.byteLength ?? null
  } : null;
}

function toLocalAgreement(agreement: ApiAgreement, signatures: Record<Party, Signature>, voice: VoiceNote) {
  return {
    id: agreement.id,
    text: agreement.challenge || agreement.title,
    benefit: agreement.stake.label,
    voice,
    signatures,
    createdAt: agreement.createdAt,
    winner: null as Party | null,
    shareCode: agreement.shareCode
  };
}

export function PromisePage() {
  const { state, update, notify, auth } = usePlayer();
  const shareLink = useLinkSharing();
  const draft = state.draft;
  const { memory, remember } = usePageMemory();
  const navigate = useNavigate();
  const [stamping, setStamping] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [pendingSeal, setPendingSeal] = useState(false);
  const [pendingSelfClaim, setPendingSelfClaim] = useState(false);
  const [restartOpen, setRestartOpen] = useState(false);
  const [issueLoading, setIssueLoading] = useState(false);
  const [issueError, setIssueError] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);
  const issuingRef = useRef(false);
  const claimingRef = useRef(false);
  const section = useRef<HTMLElement>(null);
  const initialScrollTop = useRef(memory.scrollTop.promise ?? 0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const sealing = useRef(false);
  const sealRequestId = useRef<string | null>(null);
  const agreement = draft.agreementId ? state.agreements.find(item => item.id === draft.agreementId) : null;
  const issuanceId = agreement ? `promise-${agreement.id}` : null;
  const issuance = issuanceId ? state.issuedBenefits[issuanceId] ?? null : null;
  const flowStep = Math.min(draft.step, 3);
  const activeStep = flowStep >= 3 ? 2 : flowStep >= 2 ? 1 : flowStep;

  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    const element = section.current;
    if (!element) return;
    element.scrollTop = initialScrollTop.current;
    const saveScroll = () => remember({ scrollTop: { promise: element.scrollTop } });
    element.addEventListener("scroll", saveScroll, { passive: true });
    return () => { saveScroll(); element.removeEventListener("scroll", saveScroll); };
  }, [remember]);
  useEffect(() => {
    if (flowStep > 0 && section.current) section.current.scrollTop = 0;
  }, [flowStep]);
  useEffect(() => {
    if (flowStep !== 3 || !agreement || issuance || issuingRef.current) return;
    void persistBenefit(agreement.voice ?? draft.voice);
  }, [agreement, draft.voice, flowStep, issuance]);

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
          voice: toAgreementVoice(draft.voice),
          stake: { type: copy.promise.options.some(option => option === draft.benefit) ? "coupon" : "custom", label: draft.benefit.trim(), fulfilled: false, additions: [] }
        });
        update(current => {
          if (current.draft.step !== 1) return current;
          return {
            ...current,
            agreements: [toLocalAgreement(result.agreement, signatures, current.draft.voice), ...current.agreements.filter(item => item.id !== result.agreement.id)],
            draft: { ...current.draft, step: 2, agreementId: result.agreement.id, winner: null }
          };
        });
      } else {
        const id = crypto.randomUUID();
        const createdAt = new Date().toISOString();
        update(current => {
          if (current.draft.step !== 1) return current;
          return { ...current, agreements: [{ id, text: current.draft.text.trim(), benefit: current.draft.benefit.trim(), voice: current.draft.voice, signatures: current.draft.signatures, createdAt, winner: null }, ...current.agreements], draft: { ...current.draft, step: 2, agreementId: id, winner: null } };
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

  function startSettlement() {
    if (!agreement || draft.step >= 3) return;
    setIssueError(false);
    update(current => ({ ...current, draft: { ...current.draft, step: 3 } }));
  }

  function cancelPromise() {
    if (stamping) return;
    // Completed agreements and their coupons still reference these recordings.
    const assetIds = draft.agreementId ? [] : [draft.voice.assetId].filter((id): id is string => Boolean(id));
    clearTimeout(timer.current);
    sealRequestId.current = null;
    setPendingSeal(false);
    setPendingSelfClaim(false);
    setRestartOpen(false);
    setAuthOpen(false);
    update(current => ({ ...current, draft: emptyDraft() }));
    void Promise.all(assetIds.map(assetId => deleteVoiceAsset(assetId))).catch(() => undefined);
    navigate("/promise", { replace: true });
  }

  function requestRestart() {
    if (!stamping) setRestartOpen(true);
  }

  async function persistBenefit(voice: VoiceNote) {
    if (!agreement || issuance || issuingRef.current) return;
    const localIssuanceId = `promise-${agreement.id}`;
    setIssueError(false);
    if (isPlayerApiConfigured()) {
      issuingRef.current = true;
      setIssueLoading(true);
      try {
        const result = await playerApi.createIndependentCoupon({
          requestId: localIssuanceId,
          name: normalizeCouponName(agreement.benefit, copy.wallet.issueVoiceTitle),
          description: normalizeCouponDescription(agreement.text, agreement.benefit),
          sourceLabel: copy.wallet.issueSourceOptions.promise,
          signatureDataUrl: null,
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
              signature: [],
              voice,
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
        setIssueError(true);
        notify(error instanceof PlayerApiError && error.status === 0 ? copy.auth.network : copy.promise.settlementIssueFailed);
        return;
      } finally {
        issuingRef.current = false;
        setIssueLoading(false);
      }
    }
    update(current => issueDirectBenefit(current, current.draft.benefit, current.profileName, [], current.draft.text, new Date().toISOString(), localIssuanceId, "promise", voice));
    notify(copy.promise.issueBenefitSigned);
  }

  function retrySettlementIssuance() {
    if (!agreement || issueLoading) return;
    void persistBenefit(agreement.voice ?? draft.voice);
  }

  async function shareBenefit() {
    await shareLink(benefitShareData(issuance, draft.text));
  }

  async function shareAgreementCard() {
    if (!agreement) return;
    try {
      const result = await shareAgreementImage({
        text: agreement.text,
        createdAt: agreement.createdAt,
        signatures: agreement.signatures,
        participantNames: { a: state.profileName, b: copy.promise.shareCard.anonymousCounterparty }
      });
      if (result === "cancelled") return;
      notify(result === "shared" ? copy.promise.shareCard.shareOpened : copy.promise.shareCard.savedCard);
    } catch {
      notify(copy.promise.shareCard.shareImageFailed);
    }
  }

  async function selfClaimBenefit(authReady = false) {
    if (!issuance || issuance.status !== "pending_claim" || claimingRef.current) return;
    if (issuance.claimToken && isPlayerApiConfigured()) {
      if (!auth.user && !authReady) {
        setPendingSelfClaim(true);
        setAuthOpen(true);
        return;
      }
      claimingRef.current = true;
      setClaimLoading(true);
      try {
        await playerApi.claimOwnCoupon(issuance.remoteId ?? issuance.id);
        update(current => claimDirectBenefit(current, issuance.id, current.profileName));
        notify(copy.promise.issueBenefitClaimed);
      } catch (error) {
        notify(error instanceof PlayerApiError && error.status === 0 ? copy.auth.network : copy.wallet.claimError);
      } finally {
        claimingRef.current = false;
        setClaimLoading(false);
      }
      return;
    }
    update(current => claimDirectBenefit(current, issuance.id, current.profileName));
    notify(copy.promise.issueBenefitClaimed);
  }

  return <section className={`bet-module${flowStep === 0 ? " is-creating" : flowStep === 1 ? " is-signing" : flowStep === 3 ? " is-settling" : ""}`} ref={section}>
    <PromiseProgress activeStep={activeStep} onRestart={requestRestart} disabled={stamping} />
    {flowStep === 0 && <div className="page-transition" key="promise-create"><PromiseForm draft={draft} onContinue={() => { if (draft.voice.assetId) update(current => ({ ...current, draft: { ...current.draft, step: 1 } })); }} /></div>}
    {flowStep === 1 && <div className="page-transition" key="promise-sign"><SigningStep draft={draft} stamping={stamping} onSignature={sign} onSeal={seal} /></div>}
    {flowStep === 2 && <div className="page-transition settlement-flow promise-settlement promise-signed" key="promise-signed">
      <AgreementCard text={agreement?.text ?? draft.text} voice={draft.voice} status={copy.promise.shareCard.signed}
        participants={[
          { role: "initiator", nickname: state.profileName, signed: Boolean(draft.signatures.a.length), signature: draft.signatures.a },
          { role: "counterparty", nickname: copy.promise.shareCard.anonymousCounterparty, signed: Boolean(draft.signatures.b.length), signature: draft.signatures.b }
        ]}
        createdAt={agreement?.createdAt} />
      <div className="promise-settlement-actions">
        <button className="promise-share-card" type="button" onClick={() => void shareAgreementCard()}><Icon name="share" size={16} />{copy.promise.shareCard.shareAction}</button>
        <button className="contract-cta" type="button" onClick={startSettlement}>
          <span>{copy.promise.goToSettlement}</span><Icon name="arrow" />
        </button>
      </div>
    </div>}
    {flowStep === 3 && <div className="page-transition settlement-flow promise-settlement promise-benefit-settlement" key="promise-benefit-settlement">
      <div className="promise-settlement-heading">
        <small>{copy.promise.steps[2]}</small>
        <h1>{issuance?.status === "claimed" ? copy.promise.issuedClaimedTitle : copy.promise.issuedTitle}</h1>
        <p>{issuance?.status === "claimed" ? copy.promise.issuedClaimedTitleEnd : copy.promise.issueBenefitPending}</p>
      </div>
      {issuance ? <BenefitShareCard title={issuance.title} context={issuance.sourceNote ?? agreement?.text ?? ""} issuerName={issuance.issuerName} source={issuance.source} voice={issuance.voice} active={flowStep === 3} status={issuance.status === "unavailable" ? copy.sharing.closed : issuance.status === "claimed" ? copy.wallet.issueClaimed : copy.wallet.issuePending} /> : <div className="promise-issue-loading" aria-busy="true"><Icon name="spark" size={18} /><span>{issueError ? copy.promise.settlementIssueFailed : copy.sharing.issuing}</span></div>}
      <div className="promise-settlement-actions">
        {issuance?.status === "pending_claim" && issuance.claimToken && <button className="promise-share-card" type="button" onClick={() => void shareBenefit()}>
          <Icon name="share" size={16} />{copy.promise.issueBenefitShare}
        </button>}
        {issuance?.status === "pending_claim" && <button className="text-button promise-self-claim" type="button" disabled={claimLoading} onClick={() => void selfClaimBenefit()}>
          {claimLoading ? copy.sharing.claiming : copy.promise.issueBenefitSelfClaim}
        </button>}
        {issuance?.status === "claimed" && <button className="contract-cta" type="button" onClick={openWallet}>
          <span>{copy.promise.viewWallet}</span><Icon name="arrow" />
        </button>}
        {issuance?.status === "unavailable" && <p className="promise-benefit-status">{copy.sharing.closed}</p>}
        {!issuance && issueError && <button className="contract-cta" type="button" disabled={issueLoading} onClick={retrySettlementIssuance}>
          <span>{copy.promise.settlementRetry}</span><Icon name="restart" />
        </button>}
      </div>
    </div>}
    <ConfirmDialog open={restartOpen} onClose={() => setRestartOpen(false)} title={copy.promise.restartTitle} description={copy.promise.restartHint} confirmLabel={copy.promise.restartConfirm} onConfirm={cancelPromise} />
    <AuthSheet open={authOpen} onClose={() => { setAuthOpen(false); setPendingSeal(false); setPendingSelfClaim(false); }} onSuccess={() => { const shouldSeal = pendingSeal; const shouldSelfClaim = pendingSelfClaim; setPendingSeal(false); setPendingSelfClaim(false); if (shouldSeal) void sealAfterAuth(true); if (shouldSelfClaim) void selfClaimBenefit(true); }} />
  </section>;
}
