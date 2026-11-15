"use client";

import { useCallback, useState } from "react";

export function useDropZone(onFile: (file: File) => void) {
  const [over, setOver] = useState(false);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setOver(true);
  }, []);
  const onDragLeave = useCallback(() => setOver(false), []);
  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setOver(false);
      const f = e.dataTransfer.files?.[0];
      if (f) onFile(f);
    },
    [onFile]
  );

  return { over, bind: { onDragOver, onDragLeave, onDrop } };
}
