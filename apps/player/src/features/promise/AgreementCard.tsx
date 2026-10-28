import type { ReactNode } from "react";
import { playerCopy as copy } from "@playbit/content/player";
import { Icon } from "../../components/ui/Icon";
import type { Signature, VoiceNote } from "../../data/types";
import { RevealVoiceSeal } from "./RevealVoiceSeal";
import { SignatureMark } from "./SignaturePad";
import { formatVoiceDuration, VoiceWave } from "./VoiceNoteButton";
import { useVoicePlayback } from "./useVoicePlayback";

export type AgreementCardParticipant = {
  role: "initiator" | "counterparty";
  nickname: string;
  signed: boolean;
  signature?: Signature;
};

type AgreementCardProps = {
  text: string;
  benefit: string;
  challengeVoice: VoiceNote;
  benefitVoice: VoiceNote;
  status: string;
  participants?: AgreementCardParticipant[];
  signatureArea?: ReactNode;
  code?: string;
  createdAt?: string;
};

function formatDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date)
    : "";
}

export function AgreementCard({ text, benefit, challengeVoice, benefitVoice, status, participants, signatureArea, code, createdAt }: AgreementCardProps) {
  const playback = useVoicePlayback(challengeVoice);
  const labels = copy.promise.shareCard;
  const voiceOnly = text === copy.promise.voice.challengeLabel || !text;
  return <article className={`agreement-card ${signatureArea ? "is-signing" : "is-shared"}`}>
    <header className="agreement-card-head">
      <strong>PLAYBIT<sup>®</sup></strong>
      <span>{status}</span>
    </header>
    <section className="agreement-card-challenge">
      <small>{labels.promiseEyebrow}</small>
      <h1>{voiceOnly ? labels.promiseTitle : text}</h1>
      <p>{voiceOnly ? labels.voiceAgreement : copy.promise.voice.contractHint}</p>
    </section>
    <div className="agreement-audio-pair">
      <div className={`agreement-audio challenge-audio ${playback.playing ? "is-playing" : ""}`}>
        <span className="agreement-audio-label"><Icon name="volume" size={15} />{copy.promise.voice.challengeLabel}</span>
        <VoiceWave tone="dark" active={playback.playing} />
        <button className="agreement-audio-play" type="button" disabled={!challengeVoice.assetId} aria-busy={playback.loading} aria-label={playback.playing ? copy.promise.voice.stopPlaying : labels.listenChallenge} onClick={() => void playback.toggle()}>
          <span>{playback.loading ? labels.audioLoading : playback.playing ? copy.promise.voice.playing : challengeVoice.assetId ? labels.listenChallenge : labels.noVoice}</span>
          <Icon name={playback.playing ? "stop" : "play"} size={17} />
        </button>
        <span className="agreement-audio-duration">{formatVoiceDuration(challengeVoice.durationMs)}</span>
      </div>
      <RevealVoiceSeal key={`${benefitVoice.assetId ?? benefitVoice.id}-${benefit}`} voice={benefitVoice} benefit={benefit} />
    </div>
    {playback.error && <p className="agreement-audio-error" role="alert">{playback.error}</p>}
    <p className="agreement-tear-hint"><Icon name="arrow" size={13} /><span>{labels.tearHint}</span><Icon name="arrow" size={13} /></p>
    {signatureArea ?? (participants && <div className="agreement-card-participants">
      {participants.map(participant => <div className="agreement-card-participant" key={participant.role}>
        {participant.signature?.length ? <SignatureMark value={participant.signature} /> : <b>{participant.nickname}</b>}
        <small>{participant.role === "initiator" ? labels.initiator : labels.counterparty}<span> · {participant.signed ? labels.signedStatus : copy.promise.unsigned}</span></small>
      </div>)}
    </div>)}
    {(code || createdAt) && <footer className="agreement-card-footer"><span>{formatDate(createdAt)}</span>{code && <span>#{code.slice(-8).toUpperCase()}</span>}</footer>}
  </article>;
}
