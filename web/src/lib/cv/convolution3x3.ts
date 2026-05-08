export type Kernel3x3 = [
  [number, number, number],
  [number, number, number],
  [number, number, number],
];

import { convolveGrayNxNInto, type BorderPolicy } from "@/lib/cv/convolutionNxN";

export type { BorderPolicy };

function flattenKernel3x3(k: Kernel3x3): Float32Array {
  return new Float32Array([
    k[0][0],
    k[0][1],
    k[0][2],
    k[1][0],
    k[1][1],
    k[1][2],
    k[2][0],
    k[2][1],
    k[2][2],
  ]);
}

export function convolve3x3Gray(
  gray: Float32Array,
  width: number,
  height: number,
  k: Kernel3x3,
  opts?: { bias?: number; scale?: number; policy?: BorderPolicy },
): Uint8ClampedArray {
  // Core sliding-window convolution:
  // For each pixel, take the 3x3 neighborhood and compute dot(kernel, neighborhood).
  //
  // Border handling: clamp-to-edge (replicate edge pixels) so output stays same size.
  const out = new Uint8ClampedArray(width * height);
  convolve3x3GrayInto(gray, width, height, k, opts, out);
  return out;
}

export function convolve3x3GrayInto(
  gray: Float32Array,
  width: number,
  height: number,
  k: Kernel3x3,
  opts: { bias?: number; scale?: number; policy?: BorderPolicy } | undefined,
  out: Uint8ClampedArray,
): void {
  const kernel = flattenKernel3x3(k);
  convolveGrayNxNInto(gray, width, height, kernel, 3, opts?.policy ?? "clamp", opts, out);
}

