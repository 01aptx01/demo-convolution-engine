export function grayU8ToRgba(
  gray: Uint8ClampedArray,
  width: number,
  height: number,
): Uint8ClampedArray {
  // Expand a 1-channel grayscale array into RGBA for canvas ImageData.
  const out = new Uint8ClampedArray(width * height * 4);
  grayU8ToRgbaInto(gray, width, height, out);
  return out;
}

export function grayU8ToRgbaInto(
  gray: Uint8ClampedArray,
  width: number,
  height: number,
  outRgba: Uint8ClampedArray,
): void {
  if (gray.length !== width * height) {
    throw new Error("gray length must equal width*height");
  }
  if (outRgba.length !== width * height * 4) {
    throw new Error("outRgba length must equal width*height*4");
  }

  for (let p = 0, i = 0; p < gray.length; p++, i += 4) {
    const v = gray[p];
    outRgba[i] = v;
    outRgba[i + 1] = v;
    outRgba[i + 2] = v;
    outRgba[i + 3] = 255;
  }
}

