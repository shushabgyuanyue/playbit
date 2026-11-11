import { useEffect, useRef, useState, type SyntheticEvent } from "react";
import { playerCopy as copy } from "@playbit/content/player";
import type { CardMedia as Media } from "../../data/types";
import { Icon } from "../../components/ui/Icon";
import { VoiceWave } from "../promise/VoiceNoteButton";

export interface CardPalette {
  primary: string;
  secondary: string;
  surface: string;
  dark: string;
  ink: string;
}

export type CardStageMotion = "bird-2-5d";

interface Rgb {
  red: number;
  green: number;
  blue: number;
}

interface ColorCluster extends Rgb {
  score: number;
  saturation: number;
}

const paletteCache = new Map<string, CardPalette>();

function BirdParallaxImage({ src, alt, attempt, active, prefetchPalette, onLoad, onError }: {
  src: string; alt: string; attempt: number; active: boolean; prefetchPalette: boolean;
  onLoad: (event: SyntheticEvent<HTMLImageElement>) => void; onError: () => void;
}) {
  const loading = active || prefetchPalette ? "eager" : "lazy";
  const fetchPriority = active ? "high" : "auto";
  const [loadedLayers, setLoadedLayers] = useState(0);
  const [layerFailed, setLayerFailed] = useState(false);
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const layersReady = loadedLayers >= 4 && !layerFailed;
  useEffect(() => {
    setLoadedLayers(0);
    setLayerFailed(false);
    const timer = window.setTimeout(() => {
      const layers = Array.from(sceneRef.current?.querySelectorAll<HTMLImageElement>(".bird-layer:not(.bird-layer-source)") ?? []);
      if (layers.length === 4 && layers.every(layer => layer.complete && layer.naturalWidth > 0)) setLoadedLayers(4);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [attempt, src]);
  function markLayerLoaded() {
    setLoadedLayers(value => Math.min(4, value + 1));
  }
  return <div ref={sceneRef} className="bird-parallax-scene">
    <img className="bird-layer bird-layer-background" src="/media/cards/metal-bird-layer-background.webp" alt={alt} loading={loading} fetchPriority={fetchPriority} decoding="async" width={680} height={1200} onLoad={markLayerLoaded} onError={() => setLayerFailed(true)} />
    <img className="bird-layer bird-layer-finger" src="/media/cards/metal-bird-layer-finger.webp" alt="" aria-hidden="true" loading={loading} decoding="async" width={680} height={1200} onLoad={markLayerLoaded} onError={() => setLayerFailed(true)} />
    <img className="bird-layer bird-layer-body" src="/media/cards/metal-bird-layer-body.webp" alt="" aria-hidden="true" loading={loading} decoding="async" width={680} height={1200} onLoad={markLayerLoaded} onError={() => setLayerFailed(true)} />
    <img className="bird-layer bird-layer-eye" src="/media/cards/metal-bird-layer-eye.webp" alt="" aria-hidden="true" loading={loading} decoding="async" width={680} height={1200} onLoad={markLayerLoaded} onError={() => setLayerFailed(true)} />
    <img key={attempt} className={`bird-layer bird-layer-source ${layersReady ? "is-layer-ready" : ""}`} src={src} alt="" aria-hidden="true" loading={loading} fetchPriority={fetchPriority} decoding="async" width={680} height={1200} onError={onError} onLoad={onLoad} />
  </div>;
}

function toRgb({ red, green, blue }: Rgb): string {
  return `rgb(${red}, ${green}, ${blue})`;
}

function mix(first: Rgb, second: Rgb, secondWeight: number): Rgb {
  const firstWeight = 1 - secondWeight;
  return {
    red: Math.round(first.red * firstWeight + second.red * secondWeight),
    green: Math.round(first.green * firstWeight + second.green * secondWeight),
    blue: Math.round(first.blue * firstWeight + second.blue * secondWeight)
  };
}

function desaturate(color: Rgb, amount: number): Rgb {
  const gray = luminance(color) * 255;
  return mix(color, { red: gray, green: gray, blue: gray }, amount);
}

function luminance({ red, green, blue }: Rgb): number {
  return (red * 0.2126 + green * 0.7152 + blue * 0.0722) / 255;
}

function darkenForWhiteText(color: Rgb): Rgb {
  const current = luminance(color);
  if (current <= 0.22) return color;
  const weight = Math.min(0.82, Math.max(0.28, (current - 0.2) / Math.max(current, 0.01)));
  return mix(color, { red: 9, green: 10, blue: 12 }, weight);
}

function distance(first: Rgb, second: Rgb): number {
  return Math.hypot(first.red - second.red, first.green - second.green, first.blue - second.blue);
}

function extractPalette(source: CanvasImageSource): CardPalette | null {
  try {
    const canvas = document.createElement("canvas");
    const size = 32;
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.imageSmoothingEnabled = true;
    context.drawImage(source, 0, 0, size, size);
    const pixels = context.getImageData(0, 0, size, size).data;
    const clusters = new Map<string, ColorCluster>();
    for (let index = 0; index < pixels.length; index += 4) {
      const alpha = pixels[index + 3] ?? 0;
      if (alpha < 150) continue;
      const raw = { red: pixels[index] ?? 0, green: pixels[index + 1] ?? 0, blue: pixels[index + 2] ?? 0 };
      const maximum = Math.max(raw.red, raw.green, raw.blue);
      const minimum = Math.min(raw.red, raw.green, raw.blue);
      const brightness = (raw.red + raw.green + raw.blue) / 3;
      const saturation = maximum === 0 ? 0 : (maximum - minimum) / maximum;
      // Ignore paper-white and near-black background pixels; they otherwise drown out the
      // small but meaningful social colors in stickers, photos, and cover art.
      if ((brightness < 24 || brightness > 232) && saturation < 0.2) continue;
      const color = { red: Math.min(255, Math.round(raw.red / 16) * 16), green: Math.min(255, Math.round(raw.green / 16) * 16), blue: Math.min(255, Math.round(raw.blue / 16) * 16) };
      const key = `${color.red}-${color.green}-${color.blue}`;
      const cluster = clusters.get(key);
      const weight = 1 + saturation * 2.2 + (brightness > 28 && brightness < 220 ? 0.18 : 0);
      if (cluster) cluster.score += weight;
      else clusters.set(key, { ...color, score: weight, saturation });
    }
    const ranked = [...clusters.values()].sort((a, b) => b.score - a.score);
    const colorful = ranked.filter(color => color.saturation >= 0.18 && luminance(color) > 0.12 && luminance(color) < 0.92);
    const primary = colorful[0] ?? ranked[0];
    if (!primary) return null;
    const secondary = colorful.find(color => distance(color, primary) > 54) ?? colorful[1] ?? ranked.find(color => color !== primary) ?? primary;
    // Keep a little of the source color so the card feels social and alive instead of washed out.
    const mutedPrimary = desaturate(primary, 0.32);
    const mutedSecondary = desaturate(secondary, 0.42);
    const surface = mix(mutedPrimary, { red: 255, green: 255, blue: 255 }, 0.5);
    const darkSource = ranked.find(color => color.saturation > 0.18 && luminance(color) < 0.62)
      ?? ranked.find(color => luminance(color) < 0.62)
      ?? primary;
    const darkColor = darkenForWhiteText(desaturate(darkSource, 0.46));
    // Build the atmosphere from a softened version of the material; the source itself remains visible on the stage.
    return { primary: toRgb(mutedPrimary), secondary: toRgb(mutedSecondary), surface: toRgb(surface), dark: toRgb(darkColor), ink: "#fff" };
  } catch {
    return null;
  }
}

export function CardMedia({ media, active, prefetchPalette = false, visible = true, onPalette, stageMotion }: { media: Media; active: boolean; prefetchPalette?: boolean; visible?: boolean; onPalette?: (palette: CardPalette) => void; stageMotion?: CardStageMotion }) {
  const element = useRef<HTMLMediaElement | null>(null);
  const paletteFrame = useRef<number | null>(null);
  const paletteNotified = useRef<string | null>(null);
  const activeRef = useRef(active);
  activeRef.current = active;
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const mediaKey = `${media.kind}:${media.src}`;
  useEffect(() => {
    const cached = paletteCache.get(mediaKey);
    if (cached) notifyPalette(cached);
  }, [mediaKey, onPalette]);
  useEffect(() => () => {
    if (paletteFrame.current !== null) window.cancelAnimationFrame(paletteFrame.current);
  }, [mediaKey]);
  function notifyPalette(palette: CardPalette) {
    if (!onPalette) return;
    const signature = `${mediaKey}|${palette.primary}|${palette.secondary}|${palette.surface}|${palette.dark}|${palette.ink}`;
    if (paletteNotified.current === signature) return;
    paletteNotified.current = signature;
    onPalette(palette);
  }
  function schedulePalette(source: CanvasImageSource) {
    if (!onPalette && !prefetchPalette) return;
    const cached = paletteCache.get(mediaKey);
    if (cached) { notifyPalette(cached); return; }
    if (paletteFrame.current !== null) window.cancelAnimationFrame(paletteFrame.current);
    // Let the first decoded frame paint before reading the small palette canvas.
    paletteFrame.current = window.requestAnimationFrame(() => {
      const palette = extractPalette(source);
      if (palette) {
        paletteCache.set(mediaKey, palette);
        notifyPalette(palette);
      }
      paletteFrame.current = null;
    });
  }
  useEffect(() => {
    const current = element.current;
    if ((!active || !visible) && current) { current.pause(); if (!active) current.currentTime = 0; setPlaying(false); }
    return () => { current?.pause(); };
  }, [active, media.src, visible]);
  useEffect(() => {
    const current = element.current;
    if (media.kind !== "video" || !active || !visible || !current) return;
    const start = () => {
      if (!activeRef.current) return;
      if (!current.paused) return;
      current.muted = true;
      void current.play().catch(() => undefined);
    };
    current.muted = true;
    start();
    current.addEventListener("canplay", start);
    return () => {
      current.removeEventListener("canplay", start);
      current.pause();
    };
  }, [active, media.kind, media.src, visible]);
  useEffect(() => {
    const pause = () => { if (document.hidden) element.current?.pause(); };
    document.addEventListener("visibilitychange", pause);
    return () => document.removeEventListener("visibilitychange", pause);
  }, []);

  async function toggle() {
    const current = element.current;
    if (!current || !active || !visible) return;
    if (!current.paused) { current.pause(); return; }
    setError(false);
    try {
      if (current.ended) current.currentTime = 0;
      await current.play();
      if (!activeRef.current) current.pause();
    } catch (cause) {
      if (activeRef.current && !(cause instanceof DOMException && cause.name === "AbortError")) setError(true);
    }
  }
  const mediaEvents = {
    onPlay: () => { if (activeRef.current) { setError(false); setPlaying(true); } else element.current?.pause(); },
    onPause: () => setPlaying(false), onEnded: () => setPlaying(false),
    onCanPlay: () => { if (media.kind === "video" && activeRef.current) { const video = element.current as HTMLVideoElement | null; if (video && video.paused) { video.muted = true; void video.play().catch(() => undefined); } } },
    onLoadedData: () => { if (media.kind === "video") { const video = element.current as HTMLVideoElement | null; if (video) schedulePalette(video); } },
    onError: () => { setPlaying(false); setError(true); }
  };
  const isBirdParallax = media.kind === "image" && stageMotion === "bird-2-5d";
  return <div className={`card-media card-media-${media.kind} ${isBirdParallax ? "card-media-bird-2-5d" : ""}`}>
    {media.kind === "image" ? isBirdParallax ? <BirdParallaxImage src={media.src} alt={media.alt} attempt={attempt} active={active} prefetchPalette={prefetchPalette} onError={() => setError(true)} onLoad={event => { setError(false); schedulePalette(event.currentTarget); }} /> : <img key={attempt} src={media.src} alt={media.alt} loading={active || prefetchPalette ? "eager" : "lazy"} fetchPriority={active ? "high" : "auto"} decoding="async" width={640} height={480} onError={() => setError(true)} onLoad={event => { setError(false); schedulePalette(event.currentTarget); }} />
      : media.kind === "video" ? <button className="card-video" type="button" onClick={() => void toggle()} aria-label={`${playing ? copy.play.mediaPause : copy.play.mediaResume}：${media.title}`} aria-pressed={playing}>
        <video key={attempt} ref={node => { element.current = node; }} src={media.src} poster={media.poster} muted loop autoPlay playsInline preload={active ? "auto" : prefetchPalette ? "metadata" : "none"} aria-hidden="true" {...mediaEvents} />
      </button>
      : <>
        <audio key={attempt} ref={node => { element.current = node; }} src={active ? media.src : undefined} preload={active ? "metadata" : "none"} {...mediaEvents} />
        <button className="card-audio" type="button" onClick={() => void toggle()} aria-label={`${playing ? copy.play.mediaPause : copy.play.mediaPlay}：${media.title}`} aria-pressed={playing}>
          <VoiceWave tone="dark" active={playing} />
        </button>
      </>}
    {error && <button className="card-media-error" type="button" onClick={() => { setError(false); setAttempt(value => value + 1); }}><Icon name="restart" size={16} />{copy.play.mediaFailed}</button>}
  </div>;
}
