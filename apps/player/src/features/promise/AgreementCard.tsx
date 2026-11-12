import type { ReactNode } from "react";
import { playerCopy as copy } from "@playbit/content/player";
import { Icon } from "../../components/ui/Icon";
import type { Signature, VoiceNote } from "../../data/types";
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
  voice: VoiceNote;
  status: string;
  participants?: AgreementCardParticipant[];
  signatureArea?: ReactNode;
  createdAt?: string;
};

function formatDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date)
    : "";
}

export function AgreementCard({ text, voice, status, participants, signatureArea, createdAt }: AgreementCardProps) {
  const playback = useVoicePlayback(voice);
  const labels = copy.promise.shareCard;
  const voiceOnly = text === copy.promise.voice.challengeLabel || !text;
  return <article className={`agreement-card ${signatureArea ? "is-signing" : "is-shared"}`}>
    <header className="agreement-card-head">
      <strong>{labels.brand}</strong>
      {!signatureArea && <span>{status}</span>}
    </header>
    <section className="agreement-card-challenge">
      <small>{labels.promiseEyebrow}</small>
      <h1>{voiceOnly ? labels.promiseTitle : text}</h1>
    </section>
    <div className="agreement-audio-pair">
      <div className={`agreement-audio challenge-audio ${playback.playing ? "is-playing" : ""}`}>
        <button className="agreement-audio-play" type="button" disabled={!voice.assetId} aria-busy={playback.loading} aria-label={playback.playing ? copy.promise.voice.stopPlaying : labels.listenChallenge} onClick={() => void playback.toggle()}>
          <span>{playback.loading ? labels.audioLoading : playback.playing ? copy.promise.voice.playing : voice.assetId ? labels.listenChallenge : labels.noVoice}</span>
          <VoiceWave tone="dark" active={playback.playing} />
          <small>{formatVoiceDuration(voice.durationMs)}</small>
          <Icon name={playback.playing ? "stop" : "play"} size={17} />
        </button>
      </div>
    </div>
    {playback.error && <p className="agreement-audio-error" role="alert">{playback.error}</p>}
    {signatureArea ?? (participants && <div className="agreement-card-participants">
      {participants.map(participant => <div className="agreement-card-participant" key={participant.role}>
        <div className="agreement-card-signature">
          {participant.signature?.length ? <SignatureMark value={participant.signature} /> : <span>{participant.nickname.slice(0, 1)}</span>}
        </div>
        <div className="agreement-card-person">
          <b>{participant.nickname}</b>
          <small>{participant.role === "initiator" ? labels.initiator : labels.counterparty}</small>
        </div>
      </div>)}
    </div>)}
    {createdAt && <footer className="agreement-card-footer"><span>{labels.datePrefix}{formatDate(createdAt)}</span><span>{labels.keepTogether}</span></footer>}
  </article>;
}
