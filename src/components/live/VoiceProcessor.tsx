"use client";

import { useEffect, useRef } from "react";

/** Output level meter. Reads the *processed* signal only. */
export default function VoiceProcessor({ analyser }: { analyser: AnalyserNode | null }) {
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!analyser) return;
    const data = new Uint8Array(analyser.fftSize);
    let raf = 0;
    const loop = () => {
      analyser.getByteTimeDomainData(data);
      let peak = 0;
      for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i] - 128));
      if (bar.current) bar.current.style.width = `${Math.min(100, (peak / 128) * 140)}%`;
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [analyser]);

  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-alt" aria-label="Output level">
      <div ref={bar} className="h-full w-0 rounded-full bg-primary transition-[width] duration-75" />
    </div>
  );
}
