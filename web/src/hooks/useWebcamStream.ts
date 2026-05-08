"use client";

import { useEffect, useState } from "react";

export type WebcamState = {
  status: "idle" | "requesting" | "ready" | "error";
  error?: string;
  stream?: MediaStream;
};

export function useWebcamStream(args: {
  enabled: boolean;
  videoEl: HTMLVideoElement | null;
  constraints?: MediaStreamConstraints;
}): WebcamState {
  const { enabled, videoEl } = args;
  const constraints: MediaStreamConstraints =
    args.constraints ?? ({ video: { facingMode: "environment" }, audio: false } as const);

  const [state, setState] = useState<WebcamState>({ status: "idle" });

  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | undefined;

    async function start() {
      if (!enabled) return;
      if (!videoEl) return;

      setState({ status: "requesting" });
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        videoEl.srcObject = stream;
        videoEl.playsInline = true;
        videoEl.muted = true;

        // Ensure metadata is loaded before play() for width/height.
        await new Promise<void>((resolve) => {
          if (videoEl.readyState >= 1) resolve();
          else videoEl.onloadedmetadata = () => resolve();
        });

        await videoEl.play();
        if (cancelled) return;

        setState({ status: "ready", stream });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to start webcam.";
        setState({ status: "error", error: msg });
      }
    }

    void start();

    return () => {
      cancelled = true;

      // Detach and stop tracks to release the camera.
      if (videoEl) videoEl.srcObject = null;
      if (stream) stream.getTracks().forEach((t) => t.stop());
      setState({ status: "idle" });
    };
    // constraints is intentionally not deep-compared; treat it as stable input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, videoEl]);

  return state;
}

