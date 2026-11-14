"use client";

import { useRef } from "react";
import { useDropZone } from "@/hooks/useDropZone";

export default function DropZone({ onFile }: { onFile: (f: File) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const { over, bind } = useDropZone(onFile);

  return (
    <div
      {...bind}
      onClick={() => input.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
      className={`flex h-64 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed text-center transition-colors ${
        over ? "border-primary bg-surface-alt" : "border-border bg-surface hover:border-primary-dim"
      }`}
    >
      <p className="text-text">Drop a file here</p>
      <p className="mt-1 text-sm text-text-muted">or click to choose. JPEG, PNG, WebP, MP4, MOV, M4A.</p>
      <input
        ref={input}
        type="file"
        className="hidden"
        accept="image/*,video/mp4,video/quicktime,audio/mp4,audio/x-m4a"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
