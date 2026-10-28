import { useCallback, useEffect, useRef, useState } from "react";
import { playerCopy as copy } from "@playbit/content/player";
import type { VoiceNote } from "../../data/types";
import { loadVoiceAsset } from "../../services/voiceRepository";

export function useVoicePlayback(voice: VoiceNote) {
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const audio = useRef<HTMLAudioElement | null>(null);
  const url = useRef<string | null>(null);
  const request = useRef(0);

  const stop = useCallback(() => {
    request.current += 1;
    audio.current?.pause();
    audio.current = null;
    if (url.current) URL.revokeObjectURL(url.current);
    url.current = null;
    setPlaying(false);
    setLoading(false);
  }, []);

  useEffect(() => { setError(""); return stop; }, [voice.assetId, stop]);

  async function toggle() {
    if (playing || loading) { stop(); return; }
    if (!voice.assetId) return;
    const currentRequest = ++request.current;
    setError("");
    setLoading(true);
    try {
      const blob = await loadVoiceAsset(voice.assetId);
      if (currentRequest !== request.current) return;
      if (!blob) throw new Error("Missing audio");
      url.current = URL.createObjectURL(blob);
      const player = new Audio(url.current);
      audio.current = player;
      player.onended = stop;
      player.onerror = () => { stop(); setError(copy.promise.voice.playError); };
      await player.play();
      if (currentRequest !== request.current) { player.pause(); return; }
      setPlaying(true);
      setLoading(false);
    } catch {
      if (currentRequest !== request.current) return;
      stop();
      setError(copy.promise.voice.playError);
    }
  }

  return { playing, loading, error, toggle, stop };
}
