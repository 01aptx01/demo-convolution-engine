"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { KernelGrid3x3 } from "@/components/KernelGrid3x3";
import { convolve3x3Gray, type Kernel3x3 } from "@/lib/cv/convolution3x3";
import { grayU8ToRgba } from "@/lib/cv/grayToRgba";
import { rgbaToGrayscaleLuma } from "@/lib/cv/grayscale";

type LoadedImage = {
  width: number;
  height: number;
  rgba: Uint8ClampedArray;
};

function drawRgbaToCanvas(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  rgba: Uint8ClampedArray,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  canvas.width = width;
  canvas.height = height;
  // Avoid `new ImageData(rgba, w, h)` here: some TS DOM lib setups type `rgba`
  // as Uint8ClampedArray<ArrayBufferLike> and reject it at build-time.
  const imageData = ctx.createImageData(width, height);
  imageData.data.set(rgba);
  ctx.putImageData(imageData, 0, 0);
}

async function fileToRgba(file: File): Promise<LoadedImage> {
  // Decode -> draw -> readback RGBA via a staging (hidden) canvas.
  const bitmap = await createImageBitmap(file);
  const w = bitmap.width;
  const h = bitmap.height;

  const stage = document.createElement("canvas");
  stage.width = w;
  stage.height = h;

  const ctx = stage.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    throw new Error("Could not create 2D canvas context.");
  }

  ctx.drawImage(bitmap, 0, 0, w, h);
  const rgba = ctx.getImageData(0, 0, w, h).data;
  return { width: w, height: h, rgba };
}

export default function Home() {
  const originalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const outputCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [loaded, setLoaded] = useState<LoadedImage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [kernel, setKernel] = useState<Kernel3x3>([
    [-1, 0, 1],
    [-2, 0, 2],
    [-1, 0, 1],
  ]);
  const [scale, setScale] = useState<number>(1);
  const [bias, setBias] = useState<number>(128);

  const gray = useMemo(() => {
    if (!loaded) return null;
    return rgbaToGrayscaleLuma(loaded.rgba, loaded.width, loaded.height);
  }, [loaded]);

  const filteredU8 = useMemo(() => {
    if (!gray || !loaded) return null;
    return convolve3x3Gray(gray, loaded.width, loaded.height, kernel, {
      scale,
      bias,
    });
  }, [gray, loaded, kernel, scale, bias]);

  // Draw canvases when we have data
  useEffect(() => {
    if (!loaded) return;
    const originalCanvas = originalCanvasRef.current;
    if (originalCanvas) {
      drawRgbaToCanvas(originalCanvas, loaded.width, loaded.height, loaded.rgba);
    }
  }, [loaded]);

  useEffect(() => {
    if (!loaded || !filteredU8) return;
    const outputCanvas = outputCanvasRef.current;
    if (!outputCanvas) return;
    const rgba = grayU8ToRgba(filteredU8, loaded.width, loaded.height);
    drawRgbaToCanvas(outputCanvas, loaded.width, loaded.height, rgba);
  }, [loaded, filteredU8]);

  return (
    <div className="min-h-full bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            X-Ray Vision: Matrix Convolution Engine
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Upload an image → extract raw RGBA → convert to grayscale (pure math)
            → apply a 3×3 convolution kernel (sliding window).
          </p>
        </header>

        <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">Image upload</span>
              <input
                type="file"
                accept="image/*"
                className="block w-full text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-zinc-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-zinc-700 dark:file:bg-zinc-50 dark:file:text-zinc-950 dark:hover:file:bg-zinc-200"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setError(null);
                  try {
                    const img = await fileToRgba(f);
                    setLoaded(img);
                  } catch (err) {
                    setLoaded(null);
                    setError(
                      err instanceof Error ? err.message : "Failed to load image.",
                    );
                  }
                }}
              />
            </label>

            <div className="flex flex-col gap-3">
              <div className="text-sm text-zinc-600 dark:text-zinc-400">
                {loaded ? (
                  <span>
                    {loaded.width}×{loaded.height} px
                  </span>
                ) : (
                  <span>No image loaded</span>
                )}
              </div>

              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950">
                <div className="flex items-baseline justify-between gap-4">
                  <div className="text-sm font-semibold">3×3 kernel</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    dot(kernel, neighborhood)
                  </div>
                </div>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-6">
                  <KernelGrid3x3 kernel={kernel} onChange={setKernel} />
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                        scale
                      </span>
                      <input
                        type="number"
                        step="0.1"
                        value={scale}
                        className="h-10 w-28 rounded-lg border border-zinc-200 bg-white px-2 text-right font-mono text-sm shadow-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950"
                        onChange={(e) => {
                          const n = Number(e.target.value);
                          setScale(Number.isFinite(n) ? n : 1);
                        }}
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                        bias
                      </span>
                      <input
                        type="number"
                        step="1"
                        value={bias}
                        className="h-10 w-28 rounded-lg border border-zinc-200 bg-white px-2 text-right font-mono text-sm shadow-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950"
                        onChange={(e) => {
                          const n = Number(e.target.value);
                          setBias(Number.isFinite(n) ? n : 0);
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      className="col-span-2 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
                      onClick={() => {
                        setKernel([
                          [0, 0, 0],
                          [0, 1, 0],
                          [0, 0, 0],
                        ]);
                        setScale(1);
                        setBias(0);
                      }}
                    >
                      Reset to identity
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {error ? (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          ) : null}
        </section>

        <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-semibold">Original (RGBA)</h2>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                ctx.getImageData().data
              </span>
            </div>
            <div className="mt-3 overflow-auto rounded-lg bg-zinc-100 p-2 dark:bg-zinc-950">
              <canvas ref={originalCanvasRef} className="block max-w-full" />
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-semibold">Filtered (3×3 Convolution)</h2>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                clamp-to-edge borders, output clamped to 0..255
              </span>
            </div>
            <div className="mt-3 overflow-auto rounded-lg bg-zinc-100 p-2 dark:bg-zinc-950">
              <canvas ref={outputCanvasRef} className="block max-w-full" />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
