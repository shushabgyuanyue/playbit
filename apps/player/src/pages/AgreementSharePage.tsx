import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Agreement as ApiAgreement } from "@playbit/shared";
import { playerCopy as copy } from "@playbit/content/player";
import { Icon } from "../components/ui/Icon";
import { demoVoice } from "../data/demo";
import type { Agreement } from "../data/types";
import { AgreementCard, type AgreementCardParticipant } from "../features/promise/AgreementCard";
import { usePlayer } from "../features/player/PlayerProvider";
import { AuthSheet } from "../features/player/AuthSheet";
import { isPlayerApiConfigured, PlayerApiError, playerApi } from "../services/playerApi";

type SharedParticipant = AgreementCardParticipant;
type SharedAgreement = {
  id: string;
  shareCode?: string;
  text: string;
  benefit: string;
  createdAt: string;
  challengeVoice: ReturnType<typeof demoVoice>;
  benefitVoice: ReturnType<typeof demoVoice>;
  participants: SharedParticipant[];
};

function fromLocal(agreement: Agreement, profileName: string): SharedAgreement {
  return {
    id: agreement.id,
    shareCode: agreement.shareCode,
    text: agreement.text,
    benefit: agreement.benefit,
    createdAt: agreement.createdAt,
    challengeVoice: agreement.challengeVoice ?? demoVoice(agreement.text, "challenge"),
    benefitVoice: agreement.benefitVoice ?? demoVoice(agreement.benefit, "benefit"),
    participants: [
      { role: "initiator", nickname: profileName, signed: Boolean(agreement.signatures.a.length), signature: agreement.signatures.a },
      { role: "counterparty", nickname: copy.promise.shareCard.counterparty, signed: Boolean(agreement.signatures.b.length), signature: agreement.signatures.b }
    ]
  };
}

function fromRemote(agreement: ApiAgreement): SharedAgreement {
  return {
    id: agreement.id,
    shareCode: agreement.shareCode,
    text: agreement.challenge || agreement.title,
    benefit: agreement.stake.label,
    createdAt: agreement.createdAt,
    challengeVoice: demoVoice(agreement.challenge || agreement.title, "challenge"),
    benefitVoice: demoVoice(agreement.stake.label, "benefit"),
    participants: agreement.participants.map(participant => ({
      role: participant.role,
      nickname: participant.nickname,
      signed: Boolean(participant.signatureDataUrl) || participant.confirmed
    }))
  };
}

export function AgreementSharePage() {
  const { shareCode = "" } = useParams();
  const navigate = useNavigate();
  const { state, auth } = usePlayer();
  const localAgreement = state.agreements.find(item => item.id === shareCode || item.shareCode === shareCode);
  const [remoteAgreement, setRemoteAgreement] = useState<ApiAgreement | null>(null);
  const [loading, setLoading] = useState(!localAgreement);
  const [failed, setFailed] = useState(false);
  const [restricted, setRestricted] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    if (localAgreement || !shareCode || !isPlayerApiConfigured()) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setFailed(false);
    setRestricted(false);
    setRemoteAgreement(null);
    void playerApi.getAgreementShare(shareCode).then(result => {
      if (active) setRemoteAgreement(result.agreement);
    }).catch(error => {
      if (active) {
        setFailed(true);
        setRestricted(error instanceof PlayerApiError && error.status === 403);
      }
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [localAgreement, shareCode, auth.user?.id]);

  const agreement = localAgreement
    ? fromLocal(localAgreement, state.profileName)
    : remoteAgreement
      ? fromRemote(remoteAgreement)
      : null;

  function openPlaybit() {
    navigate(localAgreement ? `/agreements/${localAgreement.id}` : "/");
  }

  if (loading) return <section className="agreement-share-page share-state"><Icon name="file" size={28} /><p>{copy.promise.shareCard.loading}</p></section>;
  if (!agreement || failed) return <section className="agreement-share-page share-state"><Icon name="file" size={28} /><h1>{restricted ? copy.promise.shareCard.restricted : copy.promise.shareCard.unavailable}</h1>{restricted && !auth.user ? <button className="share-open-button" onClick={() => setAuthOpen(true)}>{copy.promise.shareCard.loginToView}<Icon name="arrow" size={16} /></button> : <button className="share-open-button" onClick={() => navigate("/")}>{copy.nav.play}<Icon name="arrow" size={16} /></button>}<AuthSheet open={authOpen} onClose={() => setAuthOpen(false)} /></section>;

  return <section className="agreement-share-page page-transition">
    <AgreementCard text={agreement.text} benefit={agreement.benefit} challengeVoice={agreement.challengeVoice} benefitVoice={agreement.benefitVoice} status={agreement.participants.length >= 2 && agreement.participants.every(participant => participant.signed) ? copy.promise.shareCard.signed : copy.promise.shareCard.signing} participants={agreement.participants} code={agreement.shareCode ?? agreement.id} createdAt={agreement.createdAt} />
    <button className="share-open-button" onClick={openPlaybit}>{localAgreement ? copy.promise.shareCard.openPlaybit : copy.promise.shareCard.enterPlaybit}<Icon name="arrow" size={17} /></button>
  </section>;
}
