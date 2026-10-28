import { useEffect, useRef, useState } from "react";
import { playerCopy as copy } from "@playbit/content/player";
import type { CardMedia as Media } from "../../data/types";
import { Icon } from "../../components/ui/Icon";
import { VoiceWave } from "../promise/VoiceNoteButton";

export function CardMedia({ media, active }: { media: Media; active: boolean }) {
  const element = useRef<HTMLMediaElement | null>(null);
  const activeRef = useRef(active);
  activeRef.current = active;
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const current = element.current;
    if (!active && current) { current.pause(); current.currentTime = 0; setPlaying(false); }
    return () => { current?.pause(); };
  }, [active, media.src]);
  useEffect(() => {
    const pause = () => { if (document.hidden) element.current?.pause(); };
    document.addEventListener("visibilitychange", pause);
    return () => document.removeEventListener("visibilitychange", pause);
  }, []);

  async function toggle() {
    const current = element.current;
    if (!current || !active) return;
    if (!current.paused) { current.pause(); current.currentTime = 0; return; }
    setError(false);
    try {
      await current.play();
      if (!activeRef.current) current.pause();
    } catch (cause) {
      if (activeRef.current && !(cause instanceof DOMException && cause.name === "AbortError")) setError(true);
    }
  }
  const mediaEvents = {
    onPlay: () => { if (activeRef.current) { setError(false); setPlaying(true); } else element.current?.pause(); },
    onPause: () => setPlaying(false), onEnded: () => setPlaying(false),
    onError: () => { setPlaying(false); setError(true); }
  };
  return <div className={`card-media card-media-${media.kind}`}>
    {media.kind === "image" ? <img key={attempt} src={media.src} alt={media.alt} loading={active ? "eager" : "lazy"} decoding="async" width={640} height={480} onError={() => setError(true)} onLoad={() => setError(false)} />
      : media.kind === "video" ? <video key={attempt} ref={node => { element.current = node; }} src={active ? media.src : undefined} poster={media.poster} controls={active} playsInline preload={active ? "metadata" : "none"} aria-label={media.title} {...mediaEvents} />
      : <>
        <audio key={attempt} ref={node => { element.current = node; }} src={active ? media.src : undefined} preload={active ? "metadata" : "none"} {...mediaEvents} />
        <button className="card-audio" type="button" onClick={() => void toggle()} aria-label={`${playing ? copy.play.mediaStop : copy.play.mediaPlay}：${media.title}`} aria-pressed={playing}>
          <VoiceWave tone="dark" active={playing} /><span><b>{media.title}</b><small>{media.duration}</small></span><Icon name={playing ? "stop" : "play"} size={19} />
        </button>
      </>}
    {error && <button className="card-media-error" type="button" onClick={() => { setError(false); setAttempt(value => value + 1); }}><Icon name="restart" size={16} />{copy.play.mediaFailed}</button>}
  </div>;
}
