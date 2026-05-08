"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  enabled: boolean;
  allocCount: number;
};

export function PerfOverlay({ enabled, allocCount }: Props) {
  const [fps, setFps] = useState<number>(0);
  const lastRef = useRef<number>(performance.now());
  const framesRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;
    let raf: number | null = null;
    let running = true;

    const tick = (t: number) => {
      if (!running) return;
      framesRef.current++;
      const dt = t - lastRef.current;
      if (dt >= 500) {
        const f = (framesRef.current * 1000) / dt;
        setFps(f);
        framesRef.current = 0;
        lastRef.current = t;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      running = false;
      if (raf != null) cancelAnimationFrame(raf);
    };
  }, [enabled]);

  const heapHint = useMemo(() => {
    // Optional Chrome-only heuristic.
    const anyPerf = performance as unknown as { memory?: { usedJSHeapSize: number } };
    return anyPerf.memory?.usedJSHeapSize;
  }, [fps]);

  if (!enabled) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 w-[280px] rounded-xl border border-zinc-200 bg-white/90 p-3 shadow-xl backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
      <div className="text-sm font-semibold">Performance</div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-zinc-700 dark:text-zinc-300">
        <div>FPS</div>
        <div className="text-right font-mono">{fps.toFixed(1)}</div>

        <div>Allocations/frame (app)</div>
        <div className="text-right font-mono">{allocCount}</div>

        <div className="col-span-2 text-[11px] text-zinc-600 dark:text-zinc-400">
          We count allocations our code controls (buffers resized). Browser APIs like
          <span className="font-mono"> getImageData()</span> may allocate internally.
        </div>

        {typeof heapHint === "number" ? (
          <>
            <div>Heap used (hint)</div>
            <div className="text-right font-mono">
              {(heapHint / (1024 * 1024)).toFixed(1)} MB
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

