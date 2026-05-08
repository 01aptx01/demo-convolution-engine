export type BorderPolicy = "clamp" | "zero" | "wrap";

function clamp(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v;
}

function wrap(v: number, size: number) {
  // Proper modulo for negatives.
  const m = v % size;
  return m < 0 ? m + size : m;
}

export function convolveGrayNxN(
  gray: Float32Array,
  width: number,
  height: number,
  kernel: Float32Array,
  kSize: number,
  policy: BorderPolicy,
  opts?: { scale?: number; bias?: number },
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(width * height);
  convolveGrayNxNInto(gray, width, height, kernel, kSize, policy, opts, out);
  return out;
}

export function convolveGrayNxNInto(
  gray: Float32Array,
  width: number,
  height: number,
  kernel: Float32Array,
  kSize: number,
  policy: BorderPolicy,
  opts: { scale?: number; bias?: number } | undefined,
  out: Uint8ClampedArray,
): void {
  // O(W*H*K^2) sliding-window convolution for odd-sized kernels.
  // Border policy controls how out-of-bounds samples are handled.
  if ((kSize & 1) === 0) throw new Error("kSize must be odd");
  if (kSize < 1) throw new Error("kSize must be >= 1");
  if (kernel.length !== kSize * kSize) {
    throw new Error("kernel length must equal kSize*kSize");
  }
  if (gray.length !== width * height) {
    throw new Error("gray length must equal width*height");
  }
  if (out.length !== width * height) {
    throw new Error("out length must equal width*height");
  }

  const r = (kSize - 1) >> 1;
  const scale = opts?.scale ?? 1;
  const bias = opts?.bias ?? 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;

      // Dot product between kernel and neighborhood.
      for (let ky = -r, kRow = 0; ky <= r; ky++, kRow++) {
        const sy0 = y + ky;
        let sy: number;
        if (policy === "clamp") sy = clamp(sy0, 0, height - 1);
        else if (policy === "wrap") sy = wrap(sy0, height);
        else sy = sy0; // zero-padding: may be out of bounds

        const base = sy * width;
        const kBase = kRow * kSize;

        if (policy === "zero" && (sy < 0 || sy >= height)) {
          // Entire row is outside: contributes 0.
          continue;
        }

        for (let kx = -r, kCol = 0; kx <= r; kx++, kCol++) {
          const sx0 = x + kx;
          let sx: number;
          if (policy === "clamp") sx = clamp(sx0, 0, width - 1);
          else if (policy === "wrap") sx = wrap(sx0, width);
          else sx = sx0;

          if (policy === "zero" && (sx < 0 || sx >= width)) {
            continue;
          }

          sum += kernel[kBase + kCol] * gray[base + sx];
        }
      }

      const v = sum * scale + bias;
      out[y * width + x] = v < 0 ? 0 : v > 255 ? 255 : v;
    }
  }
}

export function convolveGrayNxNFloatInto(
  gray: Float32Array,
  width: number,
  height: number,
  kernel: Float32Array,
  kSize: number,
  policy: BorderPolicy,
  out: Float32Array,
): void {
  // Raw convolution into Float32 output (no scale/bias/clamp).
  // This is needed for signed pipelines (e.g., Sobel Gx/Gy) and for teaching.
  if ((kSize & 1) === 0) throw new Error("kSize must be odd");
  if (kernel.length !== kSize * kSize) {
    throw new Error("kernel length must equal kSize*kSize");
  }
  if (gray.length !== width * height) {
    throw new Error("gray length must equal width*height");
  }
  if (out.length !== width * height) {
    throw new Error("out length must equal width*height");
  }

  const r = (kSize - 1) >> 1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;

      for (let ky = -r, kRow = 0; ky <= r; ky++, kRow++) {
        const sy0 = y + ky;
        let sy: number;
        if (policy === "clamp") sy = clamp(sy0, 0, height - 1);
        else if (policy === "wrap") sy = wrap(sy0, height);
        else sy = sy0;

        if (policy === "zero" && (sy < 0 || sy >= height)) continue;

        const base = sy * width;
        const kBase = kRow * kSize;

        for (let kx = -r, kCol = 0; kx <= r; kx++, kCol++) {
          const sx0 = x + kx;
          let sx: number;
          if (policy === "clamp") sx = clamp(sx0, 0, width - 1);
          else if (policy === "wrap") sx = wrap(sx0, width);
          else sx = sx0;

          if (policy === "zero" && (sx < 0 || sx >= width)) continue;

          sum += kernel[kBase + kCol] * gray[base + sx];
        }
      }

      out[y * width + x] = sum;
    }
  }
}

