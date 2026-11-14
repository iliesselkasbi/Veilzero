"use client";

import { useEffect, useState } from "react";
import { detectKind, formatBytes } from "@/lib/fileUtils";

export default function FilePreview({ file }: { file: File | Blob; name?: string }) {
  const [url, setUrl] = useState<string>("");
  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const f = file as File;
  const kind = f.name ? detectKind(f) : file.type.startsWith("video") ? "video" : file.type.startsWith("audio") ? "audio" : "image";

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface-alt">
      <div className="flex h-56 items-center justify-center bg-bg">
        {!url ? null : kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="Preview" className="max-h-full max-w-full object-contain" />
        ) : kind === "video" ? (
          <video src={url} controls className="max-h-full max-w-full" />
        ) : kind === "audio" ? (
          <audio src={url} controls />
        ) : (
          <span className="text-sm text-text-muted">No preview</span>
        )}
      </div>
      <div className="flex justify-between px-3 py-2 text-xs font-mono text-text-muted">
        <span className="truncate pr-3">{f.name ?? "clean file"}</span>
        <span>{formatBytes(file.size)}</span>
      </div>
    </div>
  );
}
