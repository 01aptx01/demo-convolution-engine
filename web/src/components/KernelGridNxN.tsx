"use client";

type Props = {
  kSize: 3 | 5 | 7;
  kernel: number[]; // length kSize*kSize, row-major
  onChange: (next: number[]) => void;
};

export function KernelGridNxN({ kSize, kernel, onChange }: Props) {
  const expected = kSize * kSize;
  const safeKernel = kernel.length === expected ? kernel : new Array(expected).fill(0);

  return (
    <div
      className="inline-grid gap-2"
      style={{ gridTemplateColumns: `repeat(${kSize}, minmax(0, 1fr))` }}
    >
      {safeKernel.map((value, idx) => (
        <input
          key={idx}
          type="number"
          step="0.1"
          value={Number.isFinite(value) ? value : 0}
          className="h-10 w-20 rounded-lg border border-zinc-200 bg-white px-2 text-right font-mono text-sm shadow-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950"
          onChange={(e) => {
            const next = safeKernel.slice();
            const n = Number(e.target.value);
            next[idx] = Number.isFinite(n) ? n : 0;
            onChange(next);
          }}
        />
      ))}
    </div>
  );
}

