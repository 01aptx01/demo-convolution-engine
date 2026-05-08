"use client";

import { useEffect, useMemo, useRef } from "react";

type Props = {
  enabled: boolean;
  width: number;
  height: number;
  kSize: number;
  x: number;
  y: number;
  onChange: (next: { x: number; y: number }) => void;
  onStep: (dx: number, dy: number) => void;
};

export function SlidingWindowDebugger({
  enabled,
  width,
  height,
  kSize,
  x,
  y,
  onChange,
  onStep,
}: Props) {
  const maxX = Math.max(0, width - 1);
  const maxY = Math.max(0, height - 1);
  const canUse = enabled && width > 0 && height > 0;

  const kLabel = useMemo(() => `${kSize}×${kSize}`, [kSize]);
  const keyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!canUse) return;
    const el = keyRef.current;
    if (!el) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") onStep(-1, 0);
      else if (e.key === "ArrowRight") onStep(1, 0);
      else if (e.key === "ArrowUp") onStep(0, -1);
      else if (e.key === "ArrowDown") onStep(0, 1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canUse, onStep]);

  return (
    <div
      ref={keyRef}
      className={`rounded-xl border p-4 shadow-sm ${
        enabled
          ? "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
          : "border-zinc-200/60 bg-white/50 text-zinc-500 dark:border-zinc-800/60 dark:bg-zinc-900/40 dark:text-zinc-400"
      }`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-sm font-semibold">Sliding Window Debugger</div>
        <div className="text-xs text-zinc-600 dark:text-zinc-400">
          Kernel: <span className="font-mono">{kLabel}</span>
        </div>
      </div>

      <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
        Pause realtime and step pixel-by-pixel. Arrow keys also work.
      </p>

      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            x = {x}
          </span>
          <input
            type="range"
            min={0}
            max={maxX}
            value={x}
            disabled={!canUse}
            onChange={(e) => onChange({ x: Number(e.target.value), y })}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            y = {y}
          </span>
          <input
            type="range"
            min={0}
            max={maxY}
            value={y}
            disabled={!canUse}
            onChange={(e) => onChange({ x, y: Number(e.target.value) })}
          />
        </label>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <button
          type="button"
          disabled={!canUse}
          className="rounded-lg bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-50 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-800"
          onClick={() => onStep(-1, 0)}
        >
          ◀
        </button>
        <button
          type="button"
          disabled={!canUse}
          className="rounded-lg bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-50 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-800"
          onClick={() => onStep(0, -1)}
        >
          ▲
        </button>
        <button
          type="button"
          disabled={!canUse}
          className="rounded-lg bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-50 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-800"
          onClick={() => onStep(1, 0)}
        >
          ▶
        </button>
        <div />
        <button
          type="button"
          disabled={!canUse}
          className="rounded-lg bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-50 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-800"
          onClick={() => onStep(0, 1)}
        >
          ▼
        </button>
        <div />
      </div>
    </div>
  );
}

