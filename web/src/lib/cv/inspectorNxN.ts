import type { BorderPolicy } from "@/lib/cv/convolutionNxN";

function clamp(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v;
}

function wrap(v: number, size: number) {
  const m = v % size;
  return m < 0 ? m + size : m;
}

export type InspectorNxNResult = {
  x: number;
  y: number;
  kSize: number;
  neighborhoodGray: Float32Array; // length kSize*kSize, row-major
  neighborhoodKernel: Float32Array; // length kSize*kSize, row-major
  sum: number;
  scaled: number;
  clamped: number;
  equationLines: [string, string];
};

export function inspectConvolutionNxNAtPixel(args: {
  x: number;
  y: number;
  imageWidth: number;
  imageHeight: number;
  gray: Float32Array;
  kernel: Float32Array; // length kSize*kSize
  kSize: number;
  policy: BorderPolicy;
  scale: number;
  bias: number;
}): InspectorNxNResult | null {
  const { imageWidth, imageHeight, gray, kernel, kSize, policy, scale, bias } = args;
  if ((kSize & 1) === 0) return null;
  if (kSize < 1) return null;
  if (gray.length !== imageWidth * imageHeight) return null;
  if (kernel.length !== kSize * kSize) return null;

  const x = clamp(args.x, 0, imageWidth - 1);
  const y = clamp(args.y, 0, imageHeight - 1);
  const r = (kSize - 1) >> 1;

  const nGray = new Float32Array(kSize * kSize);
  const nKer = new Float32Array(kSize * kSize);

  let sum = 0;
  const parts: string[] = [];

  for (let ky = -r, row = 0; ky <= r; ky++, row++) {
    const sy0 = y + ky;
    let sy: number;
    if (policy === "clamp") sy = clamp(sy0, 0, imageHeight - 1);
    else if (policy === "wrap") sy = wrap(sy0, imageHeight);
    else sy = sy0;

    const base = sy * imageWidth;
    const kBase = row * kSize;

    for (let kx = -r, col = 0; kx <= r; kx++, col++) {
      const sx0 = x + kx;
      let sx: number;
      if (policy === "clamp") sx = clamp(sx0, 0, imageWidth - 1);
      else if (policy === "wrap") sx = wrap(sx0, imageWidth);
      else sx = sx0;

      const kIdx = kBase + col;
      const kval = kernel[kIdx];
      nKer[kIdx] = kval;

      let p = 0;
      if (policy === "zero" && (sy < 0 || sy >= imageHeight || sx < 0 || sx >= imageWidth)) {
        p = 0;
      } else {
        p = gray[base + sx];
      }
      nGray[kIdx] = p;

      sum += kval * p;
      parts.push(`${Math.round(p)}*(${kval})`);
    }
  }

  const scaled = sum * scale + bias;
  const clamped = scaled < 0 ? 0 : scaled > 255 ? 255 : scaled;

  const eq1 = `${parts.join(" + ")} = ${sum.toFixed(2)}`;
  const eq2 = `(${sum.toFixed(2)})*${scale} + ${bias} = ${scaled.toFixed(2)} → clamp = ${clamped.toFixed(2)}`;

  return { x, y, kSize, neighborhoodGray: nGray, neighborhoodKernel: nKer, sum, scaled, clamped, equationLines: [eq1, eq2] };
}

