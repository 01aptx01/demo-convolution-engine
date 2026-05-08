export function rgbaToGrayscaleLuma(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
): Float32Array {
  // Convert RGBA (interleaved 1D array) into grayscale luminance.
  //
  // Luma approximation (Rec.601):
  //   Y = 0.299R + 0.587G + 0.114B
  //
  // We keep it as Float32 so subsequent convolution is straight math without
  // repeated clamping.
  const gray = new Float32Array(width * height);

  rgbaToGrayscaleLumaInto(rgba, width, height, gray);
  return gray;
}

export function rgbaToGrayscaleLumaInto(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  outGray: Float32Array,
): void {
  // In-place variant for realtime pipelines (e.g. webcam):
  // writes into a caller-provided buffer to avoid allocations.
  if (outGray.length !== width * height) {
    throw new Error("outGray length must equal width*height");
  }

  for (let i = 0, p = 0; p < outGray.length; p++, i += 4) {
    const r = rgba[i];
    const g = rgba[i + 1];
    const b = rgba[i + 2];
    outGray[p] = 0.299 * r + 0.587 * g + 0.114 * b;
  }
}

