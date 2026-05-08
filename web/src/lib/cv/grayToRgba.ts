export function grayU8ToRgba(
  gray: Uint8ClampedArray,
  width: number,
  height: number,
): Uint8ClampedArray {
  // Expand a 1-channel grayscale array into RGBA for canvas ImageData.
  const out = new Uint8ClampedArray(width * height * 4);
  for (let p = 0, i = 0; p < gray.length; p++, i += 4) {
    const v = gray[p];
    out[i] = v;
    out[i + 1] = v;
    out[i + 2] = v;
    out[i + 3] = 255;
  }
  return out;
}

