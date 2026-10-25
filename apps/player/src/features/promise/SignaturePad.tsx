import { useEffect, useRef } from "react";
import { playerCopy as copy } from "@playbit/content/player";
import type { Point, Signature } from "../../data/types";
import { Icon } from "../../components/ui/Icon";

export function SignaturePad({ label, value, onChange }: { label: string; value: Signature; onChange: (signature: Signature) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef<Point[] | null>(null);
  function paint(strokes: Signature) {
    const element = canvas.current;
    const ctx = element?.getContext("2d");
    if (!element || !ctx) return;
    ctx.clearRect(0, 0, element.width, element.height);
    ctx.strokeStyle = "#25202a"; ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.lineJoin = "round";
    for (const stroke of strokes) {
      if (stroke.length < 2) continue;
      ctx.beginPath(); ctx.moveTo(stroke[0]!.x * element.width, stroke[0]!.y * element.height);
      for (const point of stroke.slice(1)) ctx.lineTo(point.x * element.width, point.y * element.height);
      ctx.stroke();
    }
  }
  useEffect(() => { paint(value); }, [value]);
  function point(event: React.PointerEvent<HTMLCanvasElement>): Point {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)) };
  }
  return <div className={`signature-pad ${value.length ? "signed" : ""}`}>
    <div><span>{label}</span>{value.length > 0 && <b><Icon name="check" size={12} />{copy.promise.signed}</b>}</div>
    <canvas ref={canvas} width={600} height={160} aria-label={`${label}${copy.promise.signArea}`} style={{ touchAction: "none" }}
      onPointerDown={event => { if (event.button !== 0) return; drawing.current = [point(event)]; event.currentTarget.setPointerCapture(event.pointerId); }}
      onPointerMove={event => { if (!drawing.current) return; drawing.current.push(point(event)); paint([...value, drawing.current]); }}
      onPointerUp={event => {
        const stroke = drawing.current; drawing.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        const length = stroke?.reduce((sum, p, i) => i ? sum + Math.hypot(p.x - stroke[i - 1]!.x, p.y - stroke[i - 1]!.y) : 0, 0) ?? 0;
        if (stroke && stroke.length >= 2 && length > 0.015) onChange([...value, stroke]); else paint(value);
      }}
      onPointerCancel={() => { drawing.current = null; paint(value); }}
      onLostPointerCapture={() => { drawing.current = null; }} />
    <button type="button" onClick={() => { drawing.current = null; onChange([]); }}>{value.length ? copy.promise.resign : copy.promise.signHere}</button>
  </div>;
}

export function SignatureMark({ value }: { value: Signature }) {
  return <svg viewBox="0 0 600 160" className="signature-mark" aria-hidden="true">{value.map((stroke, i) => <polyline key={i} points={stroke.map(p => `${p.x * 600},${p.y * 160}`).join(" ")} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />)}</svg>;
}
