import { useEffect, useRef } from "react";

export function RecordingWaveform({ stream }: { stream: MediaStream | null }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext("2d");
    if (!element || !context) return;
    let audio: AudioContext | undefined;
    let source: MediaStreamAudioSourceNode | undefined;
    let analyser: AnalyserNode | undefined;
    if (stream && typeof AudioContext !== "undefined") {
      try {
        audio = new AudioContext();
        analyser = audio.createAnalyser();
        analyser.fftSize = 1024;
        source = audio.createMediaStreamSource(stream);
        source.connect(analyser);
        void audio.resume().catch(() => undefined);
      } catch { /* Recording still works when audio visualization is unavailable. */ }
    }
    const samples = new Float32Array(1024);
    const history = Array<number>(55).fill(0);
    let frame = 0;
    let lastSample = 0;
    const draw = (time: number) => {
      const width = element.clientWidth;
      const height = element.clientHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      if (element.width !== Math.round(width * ratio) || element.height !== Math.round(height * ratio)) {
        element.width = Math.round(width * ratio);
        element.height = Math.round(height * ratio);
      }
      if (time - lastSample > 55) {
        let level = 0;
        if (analyser) {
          analyser.getFloatTimeDomainData(samples);
          level = Math.min(1, Math.sqrt(samples.reduce((sum, value) => sum + value * value, 0) / samples.length) * 6);
        }
        history.shift();
        history.push(level);
        lastSample = time;
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);
      context.strokeStyle = getComputedStyle(element).color;
      context.lineCap = "round";
      context.lineWidth = 1.6;
      const step = width / history.length;
      history.forEach((level, index) => {
        const size = Math.max(2, level * height * .88);
        const x = (index + .5) * step;
        context.globalAlpha = .3 + .7 * index / history.length;
        context.beginPath();
        context.moveTo(x, (height - size) / 2);
        context.lineTo(x, (height + size) / 2);
        context.stroke();
      });
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      source?.disconnect();
      analyser?.disconnect();
      if (audio && audio.state !== "closed") void audio.close().catch(() => undefined);
    };
  }, [stream]);

  return <canvas className="recording-waveform" ref={canvas} aria-hidden="true" />;
}
