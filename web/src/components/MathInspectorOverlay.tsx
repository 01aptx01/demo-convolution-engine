"use client";

import type { Inspector3x3Result } from "@/lib/cv/inspector3x3";

type Props = {
  visible: boolean;
  clientX: number;
  clientY: number;
  data: Inspector3x3Result | null;
};

function fmt(n: number) {
  return Number.isFinite(n) ? n.toFixed(2) : "NaN";
}

export function MathInspectorOverlay({ visible, clientX, clientY, data }: Props) {
  if (!visible || !data) return null;

  const pad = 14;
  const left = clientX + pad;
  const top = clientY + pad;

  const g = data.neighborhoodGray;
  const k = data.neighborhoodKernel;

  return (
    <div
      className="pointer-events-none fixed z-50 w-[440px] rounded-xl border border-zinc-200 bg-white/95 p-3 shadow-xl backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95"
      style={{ left, top }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-sm font-semibold">Math Inspector</div>
        <div className="text-xs text-zinc-600 dark:text-zinc-400">
          (x={data.x}, y={data.y})
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Gray 3×3 (inputs)
          </div>
          <div className="mt-2 grid grid-cols-3 gap-1 font-mono text-[11px]">
            {g.map((v, idx) => (
              <div
                key={idx}
                className="rounded bg-white px-1 py-1 text-right dark:bg-zinc-950"
              >
                {fmt(v)}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Kernel 3×3
          </div>
          <div className="mt-2 grid grid-cols-3 gap-1 font-mono text-[11px]">
            {k.map((v, idx) => (
              <div
                key={idx}
                className="rounded bg-white px-1 py-1 text-right dark:bg-zinc-950"
              >
                {v}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
          Dot product (row-major)
        </div>
        <div className="mt-2 space-y-1 font-mono text-[11px] leading-4 text-zinc-900 dark:text-zinc-50">
          <div className="break-words">{data.equationLines[0]}</div>
          <div className="break-words text-zinc-700 dark:text-zinc-300">
            {data.equationLines[1]}
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-baseline justify-between text-xs text-zinc-700 dark:text-zinc-300">
        <div>
          out(clamp): <span className="font-mono">{fmt(data.clamped)}</span>
        </div>
        {typeof data.outputPixelU8 === "number" ? (
          <div>
            out(U8): <span className="font-mono">{data.outputPixelU8}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

