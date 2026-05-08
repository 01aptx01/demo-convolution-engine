import { convolveGrayNxNFloatInto, type BorderPolicy } from "@/lib/cv/convolutionNxN";

export type MagnitudeMode = "l1" | "l2";

const SOBEL_X_3 = new Float32Array([
  -1, 0, 1,
  -2, 0, 2,
  -1, 0, 1,
]);

const SOBEL_Y_3 = new Float32Array([
  -1, -2, -1,
  0, 0, 0,
  1, 2, 1,
]);

export function sobelMagnitude3x3Into(args: {
  gray: Float32Array;
  width: number;
  height: number;
  policy: BorderPolicy;
  mode: MagnitudeMode;
  outU8: Uint8ClampedArray;
  scratchGx: Float32Array;
  scratchGy: Float32Array;
  scale?: number;
  bias?: number;
}): void {
  const {
    gray,
    width,
    height,
    policy,
    mode,
    outU8,
    scratchGx,
    scratchGy,
    scale = 1,
    bias = 0,
  } = args;

  if (gray.length !== width * height) throw new Error("gray length must equal width*height");
  if (outU8.length !== width * height) throw new Error("outU8 length must equal width*height");
  if (scratchGx.length !== width * height) throw new Error("scratchGx length must equal width*height");
  if (scratchGy.length !== width * height) throw new Error("scratchGy length must equal width*height");

  // Compute Gx and Gy into scratch buffers. We set bias=0 here because gradients are signed.
  // We'll apply optional bias/scale after magnitude combine (for display/teaching).
  convolveGrayNxNFloatInto(gray, width, height, SOBEL_X_3, 3, policy, scratchGx);
  convolveGrayNxNFloatInto(gray, width, height, SOBEL_Y_3, 3, policy, scratchGy);

  // Combine signed gradients into an edge strength magnitude.
  for (let i = 0; i < outU8.length; i++) {
    const gx = scratchGx[i];
    const gy = scratchGy[i];
    const m = mode === "l2" ? Math.sqrt(gx * gx + gy * gy) : Math.abs(gx) + Math.abs(gy);
    const v = m * scale + bias;
    outU8[i] = v < 0 ? 0 : v > 255 ? 255 : v;
  }
}

