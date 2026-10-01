const serif = '"STSong", "Songti SC", "SimSun", serif';

type PlaybitSealOptions = {
  topText?: string;
  centerText?: string;
  bottomText?: string;
  scale?: number;
};

/** Canvas version of the red confirmation seal used by contract documents. */
export function drawPlaybitSeal(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  options: PlaybitSealOptions = {}
) {
  const scale = options.scale ?? 1;
  const topText = options.topText ?? "PLAYBIT";
  const centerText = options.centerText ?? "结果留存";
  const bottomText = options.bottomText ?? "★★★";

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.14);
  ctx.globalAlpha = 0.78;
  ctx.strokeStyle = "#a63739";
  ctx.fillStyle = "#a63739";
  ctx.lineWidth = 3 * scale;
  for (const radius of [66, 57]) {
    ctx.beginPath();
    ctx.arc(0, 0, radius * scale, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.textAlign = "center";
  ctx.font = `700 ${23 * scale}px ${serif}`;
  ctx.fillText(centerText, 0, 8 * scale);
  ctx.font = `${16 * scale}px ${serif}`;
  ctx.fillText(topText, 0, -24 * scale);
  ctx.font = `${12 * scale}px ${serif}`;
  ctx.fillText(bottomText, 0, 30 * scale);
  ctx.restore();
}
