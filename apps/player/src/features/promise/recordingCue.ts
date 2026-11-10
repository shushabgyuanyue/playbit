export function recordingCue(kind: "start" | "stop") {
  if (typeof AudioContext === "undefined") return;
  try {
    const context = new AudioContext();
    void context.resume().catch(() => undefined);
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime;
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(kind === "start" ? 560 : 420, start);
    oscillator.frequency.exponentialRampToValueAtTime(kind === "start" ? 760 : 300, start + .07);
    gain.gain.setValueAtTime(.0001, start);
    gain.gain.exponentialRampToValueAtTime(.028, start + .008);
    gain.gain.exponentialRampToValueAtTime(.0001, start + .09);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + .09);
    oscillator.addEventListener("ended", () => { void context.close(); }, { once: true });
  } catch {
    // Recording remains usable when Web Audio is unavailable.
  }
}
