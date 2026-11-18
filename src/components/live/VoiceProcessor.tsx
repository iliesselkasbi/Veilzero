"use client";

import { useEffect, useRef } from "react";

interface Props {
  inputAnalyser: AnalyserNode | null;
  outputAnalyser: AnalyserNode | null;
}

/** Displays transient input/output spectra; the input analyser is never recorded or routed to output. */
export default function VoiceProcessor({ inputAnalyser, outputAnalyser }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const element = canvas.current;
    const ctx = element?.getContext("2d");
    if (!element || !ctx || !inputAnalyser || !outputAnalyser) return;

    const width = element.width;
    const height = element.height;
    const halfHeight = height / 2;
    const inputData = new Uint8Array(inputAnalyser.frequencyBinCount);
    const outputData = new Uint8Array(outputAnalyser.frequencyBinCount);
    let raf = 0;

    const drawColumn = (
      analyser: AnalyserNode,
      data: Uint8Array<ArrayBuffer>,
      y: number,
      color: string
    ) => {
      analyser.getByteFrequencyData(data);
      ctx.fillStyle = color;
      const bins = Math.min(data.length, halfHeight);
      for (let i = 0; i < bins; i++) {
        const intensity = data[i] / 255;
        if (intensity < 0.06) continue;
        ctx.globalAlpha = intensity;
        ctx.fillRect(width - 1, y + halfHeight - 1 - i, 1, 1);
      }
      ctx.globalAlpha = 1;
    };

    const loop = () => {
      ctx.drawImage(element, 1, 0, width - 1, height, 0, 0, width - 1, height);
      ctx.fillStyle = "#0A0A0A";
      ctx.fillRect(width - 1, 0, 1, height);
      ctx.strokeStyle = "#252525";
      ctx.beginPath();
      ctx.moveTo(0, halfHeight);
      ctx.lineTo(width, halfHeight);
      ctx.stroke();
      drawColumn(inputAnalyser, inputData, 0, "#9ca3af");
      drawColumn(outputAnalyser, outputData, halfHeight, "#00FF41");
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [inputAnalyser, outputAnalyser]);

  return (
    <div>
      <div className="mb-1 flex justify-between font-mono text-[10px] text-text-muted">
        <span className="text-gray-400">INPUT · LIVE ONLY</span>
        <span className="text-primary">PROCESSED · RECORDED</span>
      </div>
      <canvas
        ref={canvas}
        width={480}
        height={128}
        className="h-24 w-full rounded border border-border bg-surface"
        aria-label="Live input and processed voice spectrogram"
      />
      <p className="mt-1 text-[10px] leading-relaxed text-text-muted">
        The input spectrum is transient and never recorded. This visualization does not measure biometric matching.
      </p>
    </div>
  );
}
