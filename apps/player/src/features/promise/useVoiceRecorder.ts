import { useEffect, useRef, useState } from "react";
import { playerCopy as copy } from "@playbit/content/player";
import type { VoiceNote } from "../../data/types";
import { deleteVoiceAsset, saveVoiceAsset } from "../../services/voiceRepository";

type RecordingStatus = "idle" | "requesting" | "recording" | "saving" | "error";

export function useVoiceRecorder(onChange: (voice: VoiceNote) => void) {
  const [status, setStatus] = useState<RecordingStatus>("idle");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState("");
  const recorder = useRef<MediaRecorder | null>(null);
  const mediaStream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const session = useRef(0);
  const active = useRef(false);
  const onSaved = useRef(onChange);
  onSaved.current = onChange;

  function release() {
    clearInterval(timer.current);
    if (recorder.current) {
      recorder.current.ondataavailable = null;
      recorder.current.onstop = null;
      recorder.current.onerror = null;
      if (recorder.current.state !== "inactive") recorder.current.stop();
    }
    mediaStream.current?.getTracks().forEach(track => track.stop());
    mediaStream.current = null;
    recorder.current = null;
    active.current = false;
  }

  useEffect(() => () => {
    session.current += 1;
    release();
  }, []);

  function cancel() {
    session.current += 1;
    release();
    setStream(null);
    setStatus("idle");
    setError("");
  }

  async function start() {
    if (active.current) return;
    const currentSession = ++session.current;
    active.current = true;
    setError("");
    setElapsedMs(0);
    setStatus("requesting");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      active.current = false;
      setError(copy.promise.voice.unavailable);
      setStatus("error");
      return;
    }
    try {
      const input = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (session.current !== currentSession) {
        input.getTracks().forEach(track => track.stop());
        return;
      }
      mediaStream.current = input;
      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"].find(type => MediaRecorder.isTypeSupported(type));
      const recording = new MediaRecorder(input, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: 32000 });
      recorder.current = recording;
      const chunks: Blob[] = [];
      const startedAt = performance.now();
      recording.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      recording.onerror = () => {
        if (session.current !== currentSession) return;
        session.current += 1;
        release();
        setStream(null);
        setError(copy.promise.voice.interrupted);
        setStatus("error");
      };
      recording.onstop = () => {
        if (session.current !== currentSession) return;
        const durationMs = Math.round(performance.now() - startedAt);
        const blob = new Blob(chunks, { type: recording.mimeType || mimeType || "audio/webm" });
        release();
        active.current = true;
        setStream(null);
        setElapsedMs(durationMs);
        if (!blob.size) {
          active.current = false;
          setError(copy.promise.voice.saveError);
          setStatus("error");
          return;
        }
        setStatus("saving");
        const assetId = `voice_${crypto.randomUUID()}`;
        void saveVoiceAsset(blob, assetId).then(() => {
          if (session.current !== currentSession) {
            void deleteVoiceAsset(assetId).catch(() => undefined);
            return;
          }
          onSaved.current({ id: assetId, assetId, durationMs, mimeType: blob.type, byteLength: blob.size, storage: "indexeddb" });
          setStatus("idle");
        }).catch(() => {
          if (session.current !== currentSession) return;
          setError(copy.promise.voice.saveError);
          setStatus("error");
        }).finally(() => { if (session.current === currentSession) active.current = false; });
      };
      recording.start(250);
      setStream(input);
      setStatus("recording");
      timer.current = setInterval(() => setElapsedMs(performance.now() - startedAt), 100);
    } catch {
      if (session.current !== currentSession) return;
      release();
      setStream(null);
      setError(copy.promise.voice.microphone);
      setStatus("error");
    }
  }

  function stop() {
    if (recorder.current?.state === "recording") {
      clearInterval(timer.current);
      setStatus("saving");
      recorder.current.stop();
    }
  }

  return { status, stream, elapsedMs, error, start, stop, cancel };
}
