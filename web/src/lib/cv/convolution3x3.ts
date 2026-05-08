export type Kernel3x3 = [
  [number, number, number],
  [number, number, number],
  [number, number, number],
];

function clamp(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function convolve3x3Gray(
  gray: Float32Array,
  width: number,
  height: number,
  k: Kernel3x3,
  opts?: { bias?: number; scale?: number },
): Uint8ClampedArray {
  // Core sliding-window convolution:
  // For each pixel, take the 3x3 neighborhood and compute dot(kernel, neighborhood).
  //
  // Border handling: clamp-to-edge (replicate edge pixels) so output stays same size.
  const out = new Uint8ClampedArray(width * height);
  const bias = opts?.bias ?? 0;
  const scale = opts?.scale ?? 1;

  for (let y = 0; y < height; y++) {
    const y0 = clamp(y - 1, 0, height - 1);
    const y1 = y;
    const y2 = clamp(y + 1, 0, height - 1);

    for (let x = 0; x < width; x++) {
      const x0 = clamp(x - 1, 0, width - 1);
      const x1 = x;
      const x2 = clamp(x + 1, 0, width - 1);

      const p00 = gray[y0 * width + x0];
      const p01 = gray[y0 * width + x1];
      const p02 = gray[y0 * width + x2];
      const p10 = gray[y1 * width + x0];
      const p11 = gray[y1 * width + x1];
      const p12 = gray[y1 * width + x2];
      const p20 = gray[y2 * width + x0];
      const p21 = gray[y2 * width + x1];
      const p22 = gray[y2 * width + x2];

      const sum =
        k[0][0] * p00 +
        k[0][1] * p01 +
        k[0][2] * p02 +
        k[1][0] * p10 +
        k[1][1] * p11 +
        k[1][2] * p12 +
        k[2][0] * p20 +
        k[2][1] * p21 +
        k[2][2] * p22;

      // Educational knobs:
      // - scale lets you normalize kernels (e.g. box blur scale=1/9)
      // - bias lets you shift values (e.g. bias=128 to visualize signed gradients)
      const v = sum * scale + bias;
      out[y * width + x] = v < 0 ? 0 : v > 255 ? 255 : v;
    }
  }

  return out;
}

