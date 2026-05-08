export function drawKernelOverlay(args: {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  x: number;
  y: number;
  kSize: number;
}): void {
  const { ctx, width, height, x, y, kSize } = args;
  const r = (kSize - 1) >> 1;

  ctx.clearRect(0, 0, width, height);

  // Semi-transparent fill for the neighborhood.
  const left = x - r;
  const top = y - r;
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = "#22c55e"; // green
  ctx.fillRect(left, top, kSize, kSize);
  ctx.restore();

  // Grid lines.
  ctx.save();
  ctx.strokeStyle = "rgba(34,197,94,0.9)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= kSize; i++) {
    ctx.beginPath();
    ctx.moveTo(left + i + 0.5, top + 0.5);
    ctx.lineTo(left + i + 0.5, top + kSize + 0.5);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(left + 0.5, top + i + 0.5);
    ctx.lineTo(left + kSize + 0.5, top + i + 0.5);
    ctx.stroke();
  }
  ctx.restore();

  // Center pixel outline.
  ctx.save();
  ctx.strokeStyle = "rgba(16,185,129,1)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 0.5, y - 0.5, 1, 1);
  ctx.restore();
}

