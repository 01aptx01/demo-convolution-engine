import type { Kernel3x3 } from "@/lib/cv/convolution3x3";

function clamp(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v;
}

export type Inspector3x3Result = {
  x: number;
  y: number;
  // Pre-convolution grayscale neighborhood (inputs to the dot product), row-major.
  neighborhoodGray: [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  // Kernel coefficients, row-major.
  neighborhoodKernel: [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  sum: number;
  scaled: number;
  clamped: number;
  outputPixelU8?: number;
  equationLines: [string, string];
};

export function inspectConvolutionAtPixel(args: {
  x: number;
  y: number;
  imageWidth: number;
  imageHeight: number;
  gray: Float32Array;
  kernel: Kernel3x3;
  scale: number;
  bias: number;
  outputU8?: Uint8ClampedArray;
}): Inspector3x3Result | null {
  const { x: xIn, y: yIn, imageWidth, imageHeight, gray, kernel, scale, bias, outputU8 } =
    args;
  if (imageWidth <= 0 || imageHeight <= 0) return null;
  if (gray.length !== imageWidth * imageHeight) return null;

  const x = clamp(xIn, 0, imageWidth - 1);
  const y = clamp(yIn, 0, imageHeight - 1);

  // Clamp-to-edge border policy.
  const x0 = clamp(x - 1, 0, imageWidth - 1);
  const x1 = x;
  const x2 = clamp(x + 1, 0, imageWidth - 1);
  const y0 = clamp(y - 1, 0, imageHeight - 1);
  const y1 = y;
  const y2 = clamp(y + 1, 0, imageHeight - 1);

  const p00 = gray[y0 * imageWidth + x0];
  const p01 = gray[y0 * imageWidth + x1];
  const p02 = gray[y0 * imageWidth + x2];
  const p10 = gray[y1 * imageWidth + x0];
  const p11 = gray[y1 * imageWidth + x1];
  const p12 = gray[y1 * imageWidth + x2];
  const p20 = gray[y2 * imageWidth + x0];
  const p21 = gray[y2 * imageWidth + x1];
  const p22 = gray[y2 * imageWidth + x2];

  const k00 = kernel[0][0];
  const k01 = kernel[0][1];
  const k02 = kernel[0][2];
  const k10 = kernel[1][0];
  const k11 = kernel[1][1];
  const k12 = kernel[1][2];
  const k20 = kernel[2][0];
  const k21 = kernel[2][1];
  const k22 = kernel[2][2];

  const sum =
    k00 * p00 +
    k01 * p01 +
    k02 * p02 +
    k10 * p10 +
    k11 * p11 +
    k12 * p12 +
    k20 * p20 +
    k21 * p21 +
    k22 * p22;

  const scaled = sum * scale + bias;
  const clamped = scaled < 0 ? 0 : scaled > 255 ? 255 : scaled;

  const fmt = (n: number) => (Number.isFinite(n) ? n.toFixed(2) : "NaN");
  const fmtInt = (n: number) =>
    Number.isFinite(n) ? String(Math.round(n)) : "NaN";

  const eq1Parts: string[] = [
    `${fmtInt(p00)}*(${k00})`,
    `${fmtInt(p01)}*(${k01})`,
    `${fmtInt(p02)}*(${k02})`,
    `${fmtInt(p10)}*(${k10})`,
    `${fmtInt(p11)}*(${k11})`,
    `${fmtInt(p12)}*(${k12})`,
    `${fmtInt(p20)}*(${k20})`,
    `${fmtInt(p21)}*(${k21})`,
    `${fmtInt(p22)}*(${k22})`,
  ];

  const eq1 = `${eq1Parts.join(" + ")} = ${fmt(sum)}`;
  const eq2 = `(${fmt(sum)})*${scale} + ${bias} = ${fmt(scaled)} → clamp = ${fmt(
    clamped,
  )}`;

  const idx = y * imageWidth + x;
  const outputPixelU8 = outputU8 ? outputU8[idx] : undefined;

  return {
    x,
    y,
    neighborhoodGray: [p00, p01, p02, p10, p11, p12, p20, p21, p22],
    neighborhoodKernel: [k00, k01, k02, k10, k11, k12, k20, k21, k22],
    sum,
    scaled,
    clamped,
    outputPixelU8,
    equationLines: [eq1, eq2],
  };
}

export function inspectConvolutionAtPointer(args: {
  clientX: number;
  clientY: number;
  canvasRect: DOMRect;
  canvasWidth: number;
  canvasHeight: number;
  imageWidth: number;
  imageHeight: number;
  gray: Float32Array;
  kernel: Kernel3x3;
  scale: number;
  bias: number;
  outputU8?: Uint8ClampedArray;
}): Inspector3x3Result | null {
  const {
    clientX,
    clientY,
    canvasRect,
    canvasWidth,
    canvasHeight,
    imageWidth,
    imageHeight,
    gray,
    kernel,
    scale,
    bias,
    outputU8,
  } = args;

  if (imageWidth <= 0 || imageHeight <= 0) return null;
  if (gray.length !== imageWidth * imageHeight) return null;

  // Map mouse coordinates (CSS pixels) -> canvas pixel coordinates.
  const cx =
    (clientX - canvasRect.left) *
    (canvasWidth / Math.max(1, canvasRect.width));
  const cy =
    (clientY - canvasRect.top) *
    (canvasHeight / Math.max(1, canvasRect.height));

  const x = clamp(Math.floor(cx), 0, imageWidth - 1);
  const y = clamp(Math.floor(cy), 0, imageHeight - 1);
  return inspectConvolutionAtPixel({
    x,
    y,
    imageWidth,
    imageHeight,
    gray,
    kernel,
    scale,
    bias,
    outputU8,
  });
}

