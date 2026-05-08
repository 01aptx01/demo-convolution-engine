"use client";

import type { Kernel3x3 } from "@/lib/cv/convolution3x3";

type Props = {
  kernel: Kernel3x3;
  onChange: (next: Kernel3x3) => void;
};

function cloneKernel(k: Kernel3x3): Kernel3x3 {
  return [
    [k[0][0], k[0][1], k[0][2]],
    [k[1][0], k[1][1], k[1][2]],
    [k[2][0], k[2][1], k[2][2]],
  ];
}

export function KernelGrid3x3({ kernel, onChange }: Props) {
  return (
    <div className="inline-grid grid-cols-3 gap-2">
      {kernel.map((row, r) =>
        row.map((value, c) => (
          <input
            key={`${r}-${c}`}
            type="number"
            step="0.1"
            value={Number.isFinite(value) ? value : 0}
            className="h-10 w-20 rounded-lg border border-zinc-200 bg-white px-2 text-right font-mono text-sm shadow-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950"
            onChange={(e) => {
              const next = cloneKernel(kernel);
              const n = Number(e.target.value);
              next[r][c] = Number.isFinite(n) ? n : 0;
              onChange(next);
            }}
          />
        )),
      )}
    </div>
  );
}

