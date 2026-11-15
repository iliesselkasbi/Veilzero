"use client";

import { useEffect, useState } from "react";
import RecordButton from "./RecordButton";
import { COPY } from "@/lib/constants";

interface Props {
  recording: boolean;
  canRecord: boolean;
  done: boolean;
  onStart: () => void;
  onStop: () => void;
}

export default function StreamRecorder({ recording, canRecord, done, onStart, onStop }: Props) {
  const [secs, setSecs] = useState(0);

  useEffect(() => {
    if (!recording) return;
    setSecs(0);
    const id = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [recording]);

  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");

  return (
    <div className="flex items-center gap-4">
      <RecordButton recording={recording} disabled={!canRecord} onStart={onStart} onStop={onStop} />
      <div>
        <p className={`font-mono text-sm ${recording ? "text-danger" : done ? "text-success" : "text-text-muted"}`}>
          {recording ? COPY.recording : done ? COPY.recordingDone : COPY.ready}
        </p>
        {recording && <p className="font-mono text-xs text-text-muted">{mm}:{ss}</p>}
      </div>
    </div>
  );
}
