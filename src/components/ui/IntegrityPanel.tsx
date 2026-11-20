"use client";

import { useEffect, useState } from "react";
import { sha256Hex, shortHash } from "@/lib/hash";

export default function IntegrityPanel({
  original,
  output,
  outputLabel = "Processed",
}: {
  original?: Blob | File | null;
  output?: Blob | File | null;
  outputLabel?: string;
}) {
  const [origHex, setOrigHex] = useState("");
  const [outHex, setOutHex] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!original && !output) {
        setOrigHex("");
        setOutHex("");
        return;
      }
      setBusy(true);
      try {
        const o = original ? await sha256Hex(original) : "";
        const p = output ? await sha256Hex(output) : "";
        if (!cancelled) {
          setOrigHex(o);
          setOutHex(p);
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [original, output]);

  if (!original && !output) return null;

  return (
    <div className="rounded-lg border border-border bg-surface-alt p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[11px] uppercase tracking-wide text-primary">
          Integrity · SHA-256
        </p>
        {busy && <span className="font-mono text-[10px] text-text-muted">hashing…</span>}
      </div>
      <p className="text-xs text-text-muted">
        Local browser hash only. If original and {outputLabel.toLowerCase()} differ, bytes changed
        (expected after cloak/clean).
      </p>

      {origHex && (
        <div className="font-mono text-[11px] break-all">
          <span className="text-text-muted">ORIGINAL </span>
          <span className="text-text" title={origHex}>
            {shortHash(origHex)}
          </span>
          <button
            type="button"
            className="ml-2 text-primary hover:underline"
            onClick={() => void navigator.clipboard.writeText(origHex)}
          >
            copy
          </button>
        </div>
      )}

      {outHex && (
        <div className="font-mono text-[11px] break-all">
          <span className="text-text-muted">{outputLabel.toUpperCase()} </span>
          <span className="text-success" title={outHex}>
            {shortHash(outHex)}
          </span>
          <button
            type="button"
            className="ml-2 text-primary hover:underline"
            onClick={() => void navigator.clipboard.writeText(outHex)}
          >
            copy
          </button>
        </div>
      )}
      {origHex && outHex && (
        <p className={`font-mono text-[11px] ${origHex === outHex ? "text-danger" : "text-success"}`}>
          {origHex === outHex
            ? "⚠ Hashes match — exact same file. No threats were removed (file was already clean)."
            : "✓ Hashes differ — output is a new object. Processing changed the file bytes."}
        </p>
      )}
    </div>
  );
}