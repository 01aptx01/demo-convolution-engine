"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { KernelGrid3x3 } from "@/components/KernelGrid3x3";
import { MathInspectorOverlay } from "@/components/MathInspectorOverlay";
import { convolve3x3GrayInto, type Kernel3x3 } from "@/lib/cv/convolution3x3";
import { grayU8ToRgbaInto } from "@/lib/cv/grayToRgba";
import { rgbaToGrayscaleLumaInto } from "@/lib/cv/grayscale";
import { inspectConvolutionAtPointer } from "@/lib/cv/inspector3x3";
import { useWebcamStream } from "@/hooks/useWebcamStream";

type LoadedImage = {
  width: number;
  height: number;
  rgba: Uint8ClampedArray;
};

type SourceMode = "upload" | "webcam";

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
  const [mode, setMode] = useState<SourceMode>("upload");

  const originalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const outputCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [loaded, setLoaded] = useState<LoadedImage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [kernel, setKernel] = useState<Kernel3x3>([
    [-1, 0, 1],
    [-2, 0, 2],
    [-1, 0, 1],
  ]);
  const [scale, setScale] = useState<number>(1);
  const [bias, setBias] = useState<number>(128);

  // Buffers reused across recomputes and webcam frames.
  const buffersRef = useRef<{
    width: number;
    height: number;
    gray: Float32Array;
    outU8: Uint8ClampedArray;
    outRgba: Uint8ClampedArray;
    outImageData: ImageData | null;
  } | null>(null);

  const ensureBuffers = (width: number, height: number, ctx: CanvasRenderingContext2D) => {
    const needNew =
      !buffersRef.current ||
      buffersRef.current.width !== width ||
      buffersRef.current.height !== height;

    if (!needNew) return buffersRef.current!;

    const gray = new Float32Array(width * height);
    const outU8 = new Uint8ClampedArray(width * height);
    const outRgba = new Uint8ClampedArray(width * height * 4);
    const outImageData = ctx.createImageData(width, height);

    buffersRef.current = { width, height, gray, outU8, outRgba, outImageData };
    return buffersRef.current;
  };

  const processFrame = (rgba: Uint8ClampedArray, width: number, height: number) => {
    const outCanvas = outputCanvasRef.current;
    if (!outCanvas) return;
    const outCtx = outCanvas.getContext("2d");
    if (!outCtx) return;

    outCanvas.width = width;
    outCanvas.height = height;

    const b = ensureBuffers(width, height, outCtx);
    rgbaToGrayscaleLumaInto(rgba, width, height, b.gray);
    convolve3x3GrayInto(b.gray, width, height, kernel, { scale, bias }, b.outU8);
    grayU8ToRgbaInto(b.outU8, width, height, b.outRgba);

    // Write into ImageData and blit.
    if (!b.outImageData || b.outImageData.width !== width || b.outImageData.height !== height) {
      b.outImageData = outCtx.createImageData(width, height);
    }
    b.outImageData.data.set(b.outRgba);
    outCtx.putImageData(b.outImageData, 0, 0);
  };

  // Draw canvases when we have data
  useEffect(() => {
    if (!loaded) return;
    const originalCanvas = originalCanvasRef.current;
    if (originalCanvas) {
      drawRgbaToCanvas(originalCanvas, loaded.width, loaded.height, loaded.rgba);
    }
  }, [loaded]);

  useEffect(() => {
    if (mode !== "upload") return;
    if (!loaded) return;
    processFrame(loaded.rgba, loaded.width, loaded.height);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, loaded, kernel, scale, bias]);

  // Webcam setup
  const webcam = useWebcamStream({
    enabled: mode === "webcam",
    videoEl: videoRef.current,
  });

  // Realtime loop (webcam)
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    if (mode !== "webcam") return;
    if (webcam.status !== "ready") return;

    const video = videoRef.current;
    const stageCanvas = stageCanvasRef.current;
    const originalCanvas = originalCanvasRef.current;
    if (!video || !stageCanvas || !originalCanvas) return;

    const stageCtx = stageCanvas.getContext("2d", { willReadFrequently: true });
    const originalCtx = originalCanvas.getContext("2d");
    if (!stageCtx || !originalCtx) return;

    let running = true;

    let lastW = 0;
    let lastH = 0;

    const tick = () => {
      if (!running) return;

      const w = video.videoWidth | 0;
      const h = video.videoHeight | 0;
      if (w > 0 && h > 0) {
        if (w !== lastW || h !== lastH) {
          stageCanvas.width = w;
          stageCanvas.height = h;
          originalCanvas.width = w;
          originalCanvas.height = h;
          lastW = w;
          lastH = h;
        }

        stageCtx.drawImage(video, 0, 0, w, h);
        const frame = stageCtx.getImageData(0, 0, w, h);

        // Show original webcam frame
        originalCtx.putImageData(frame, 0, 0);

        // Convolve to output
        processFrame(frame.data, w, h);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      running = false;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, webcam.status, kernel, scale, bias]);

  // Math inspector hover state (throttled to rAF).
  const [inspectorVisible, setInspectorVisible] = useState(false);
  const [inspectorClient, setInspectorClient] = useState({ x: 0, y: 0 });
  const [inspectorData, setInspectorData] = useState<ReturnType<
    typeof inspectConvolutionAtPointer
  > | null>(null);

  const pendingPointerRef = useRef<{ x: number; y: number } | null>(null);
  const pointerRafRef = useRef<number | null>(null);

  const scheduleInspectorUpdate = () => {
    if (pointerRafRef.current !== null) return;
    pointerRafRef.current = requestAnimationFrame(() => {
      pointerRafRef.current = null;

      const outCanvas = outputCanvasRef.current;
      const b = buffersRef.current;
      const pending = pendingPointerRef.current;
      if (!outCanvas || !b || !pending) return;

      const rect = outCanvas.getBoundingClientRect();
      const res = inspectConvolutionAtPointer({
        clientX: pending.x,
        clientY: pending.y,
        canvasRect: rect,
        canvasWidth: outCanvas.width,
        canvasHeight: outCanvas.height,
        imageWidth: b.width,
        imageHeight: b.height,
        gray: b.gray,
        kernel,
        scale,
        bias,
        outputU8: b.outU8,
      });

      setInspectorClient({ x: pending.x, y: pending.y });
      setInspectorData(res);
    });
  };

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
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className={`rounded-lg px-3 py-2 text-sm font-medium ${
                    mode === "upload"
                      ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-950"
                      : "bg-zinc-100 text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
                  }`}
                  onClick={() => setMode("upload")}
                >
                  Upload
                </button>
                <button
                  type="button"
                  className={`rounded-lg px-3 py-2 text-sm font-medium ${
                    mode === "webcam"
                      ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-950"
                      : "bg-zinc-100 text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
                  }`}
                  onClick={() => {
                    setError(null);
                    setLoaded(null);
                    setMode("webcam");
                  }}
                >
                  Webcam
                </button>
                {mode === "webcam" ? (
                  <div className="text-xs text-zinc-600 dark:text-zinc-400">
                    {webcam.status === "requesting"
                      ? "Requesting camera…"
                      : webcam.status === "ready"
                        ? "Camera ready"
                        : webcam.status === "error"
                          ? `Camera error: ${webcam.error ?? "unknown"}`
                          : "Camera idle"}
                  </div>
                ) : null}
              </div>

              {mode === "upload" ? (
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
                          err instanceof Error
                            ? err.message
                            : "Failed to load image.",
                        );
                      }
                    }}
                  />
                </label>
              ) : null}
            </div>

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
            <div className="relative mt-3 overflow-auto rounded-lg bg-zinc-100 p-2 dark:bg-zinc-950">
              <canvas
                ref={outputCanvasRef}
                className="block max-w-full"
                onMouseEnter={() => setInspectorVisible(true)}
                onMouseLeave={() => {
                  setInspectorVisible(false);
                  setInspectorData(null);
                }}
                onMouseMove={(e) => {
                  pendingPointerRef.current = { x: e.clientX, y: e.clientY };
                  scheduleInspectorUpdate();
                }}
              />

              <MathInspectorOverlay
                visible={inspectorVisible}
                clientX={inspectorClient.x}
                clientY={inspectorClient.y}
                data={inspectorData ?? null}
              />
            </div>
          </div>
        </section>

        {/* Hidden elements for webcam and staging */}
        <video ref={videoRef} className="hidden" />
        <canvas ref={stageCanvasRef} className="hidden" />
      </div>
    </div>
  );
}
