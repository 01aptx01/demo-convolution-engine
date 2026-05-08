"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { BorderPolicy } from "@/lib/cv/convolution3x3";
import type { MagnitudeMode } from "@/lib/cv/sobelMagnitude";

export type EdgeMode = "off" | "sobel";
export type SourceMode = "upload" | "webcam";

export type QueryState = {
  kSize: 3 | 5 | 7;
  kernel: number[]; // length kSize*kSize
  scale: number;
  bias: number;
  policy: BorderPolicy;
  source: SourceMode;
  edge: EdgeMode;
  mag: MagnitudeMode;
  paused: boolean;
};

const DEFAULTS: QueryState = {
  kSize: 3,
  kernel: [-1, 0, 1, -2, 0, 2, -1, 0, 1],
  scale: 1,
  bias: 128,
  policy: "clamp",
  source: "upload",
  edge: "off",
  mag: "l1",
  paused: false,
};

function parseNum(v: string | null, fallback: number) {
  if (v == null) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function parseEnum<T extends string>(v: string | null, allowed: readonly T[], fallback: T): T {
  if (v == null) return fallback;
  return (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

function parseKernel(k: string | null, expectedLen: number, fallback: number[]) {
  if (!k) return fallback;
  const parts = k.split(",").map((s) => Number(s.trim()));
  if (parts.length !== expectedLen) return fallback;
  for (const n of parts) if (!Number.isFinite(n)) return fallback;
  return parts;
}

function encodeKernel(kernel: number[]) {
  return kernel.join(",");
}

export function useQueryState(): {
  state: QueryState;
  setState: (next: Partial<QueryState>) => void;
} {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const state = useMemo<QueryState>(() => {
    const kSize = parseEnum(params.get("kSize"), ["3", "5", "7"] as const, String(DEFAULTS.kSize));
    const kSizeNum = Number(kSize) as 3 | 5 | 7;
    const expected = kSizeNum * kSizeNum;

    const policy = parseEnum<BorderPolicy>(
      params.get("policy"),
      ["clamp", "zero", "wrap"] as const,
      DEFAULTS.policy,
    );

    const source = parseEnum<SourceMode>(
      params.get("source"),
      ["upload", "webcam"] as const,
      DEFAULTS.source,
    );

    const edge = parseEnum<EdgeMode>(params.get("edge"), ["off", "sobel"] as const, DEFAULTS.edge);
    const mag = parseEnum<MagnitudeMode>(params.get("mag"), ["l1", "l2"] as const, DEFAULTS.mag);
    const paused = parseEnum(params.get("paused"), ["0", "1"] as const, "0") === "1";

    return {
      kSize: kSizeNum,
      kernel: parseKernel(params.get("k"), expected, DEFAULTS.kernel),
      scale: parseNum(params.get("scale"), DEFAULTS.scale),
      bias: parseNum(params.get("bias"), DEFAULTS.bias),
      policy,
      source,
      edge,
      mag,
      paused,
    };
  }, [params]);

  const setState = (next: Partial<QueryState>) => {
    const merged: QueryState = { ...state, ...next };
    const sp = new URLSearchParams(params.toString());

    sp.set("kSize", String(merged.kSize));
    sp.set("k", encodeKernel(merged.kernel));
    sp.set("scale", String(merged.scale));
    sp.set("bias", String(merged.bias));
    sp.set("policy", merged.policy);
    sp.set("source", merged.source);
    sp.set("edge", merged.edge);
    sp.set("mag", merged.mag);
    sp.set("paused", merged.paused ? "1" : "0");

    router.replace(`${pathname}?${sp.toString()}`);
  };

  // Ensure defaults are materialized in URL on first load for shareability.
  useEffect(() => {
    const hasAny = params.get("k") || params.get("kSize") || params.get("policy");
    if (!hasAny) setState(DEFAULTS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { state, setState };
}

