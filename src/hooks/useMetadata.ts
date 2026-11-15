"use client";

import { useCallback, useMemo, useState } from "react";
import type { MetadataTrace } from "@/types/common";
import type { CleanResult } from "@/types/pool";
import { scanMetadata, stripMetadata, supportsStrip, verifyClean } from "@/lib/metadata";
import { isThreatTrace, partitionTraces } from "@/lib/traceClass";

type Phase = "idle" | "scanning" | "scanned" | "purging" | "done" | "error" | "unsupported";

export function useMetadata() {
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [traces, setTraces] = useState<MetadataTrace[]>([]);
  const [result, setResult] = useState<CleanResult | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [remainingTraces, setRemainingTraces] = useState<MetadataTrace[]>([]);
  const [note, setNote] = useState<string | null>(null);

  const { threats, structural, compromised } = useMemo(
    () => partitionTraces(traces),
    [traces]
  );

  const removedThreats = useMemo(() => {
    if (phase !== "done") return [] as MetadataTrace[];
    const leftKeys = new Set(remainingTraces.filter(isThreatTrace).map((t) => t.key));
    return threats.filter((t) => !leftKeys.has(t.key));
  }, [phase, remainingTraces, threats]);

  const reset = useCallback(() => {
    setFile(null);
    setPhase("idle");
    setTraces([]);
    setResult(null);
    setRemaining(null);
    setRemainingTraces([]);
    setNote(null);
  }, []);

  const load = useCallback(async (f: File) => {
    setFile(f);
    setResult(null);
    setRemaining(null);
    setRemainingTraces([]);
    setNote(null);
    const support = supportsStrip(f);
    if (!support.ok) {
      setPhase("unsupported");
      setNote(support.reason ?? null);
      return;
    }
    setPhase("scanning");
    try {
      const t = await scanMetadata(f);
      setTraces(t);
      setPhase("scanned");
    } catch {
      setPhase("error");
    }
  }, []);

  const purge = useCallback(async () => {
    if (!file) return;
    setPhase("purging");
    try {
      const r = await stripMetadata(file, traces);
      const leftCount = await verifyClean(r, file);
      // full rescan for UI list
      const cleanedFile = new File([r.blob], r.fileName, {
        type: r.blob.type || file.type,
      });
      const leftTraces = await scanMetadata(cleanedFile);
      setResult(r);
      setRemaining(leftCount);
      setRemainingTraces(leftTraces);
      setPhase("done");
    } catch {
      setPhase("error");
    }
  }, [file, traces]);

  return {
    file,
    phase,
    traces,
    threats,
    structural,
    compromised,
    result,
    remaining,
    remainingTraces,
    removedThreats,
    note,
    load,
    purge,
    reset,
  };
}