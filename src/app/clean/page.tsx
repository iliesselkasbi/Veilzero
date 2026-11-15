"use client";

import { useMetadata } from "@/hooks/useMetadata";
import DropZone from "@/components/clean/DropZone";
import FilePreview from "@/components/clean/FilePreview";
import MetadataScanner from "@/components/clean/MetadataScanner";
import PurgeEngine from "@/components/clean/PurgeEngine";
import BeforeAfter from "@/components/clean/BeforeAfter";
import CleanExport from "@/components/clean/CleanExport";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { COPY } from "@/lib/constants";
import { isThreatTrace } from "@/lib/traceClass";

export default function CleanPage() {
  const m = useMetadata();

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-wide">VEILZERO CLEAN</h1>
        <p className="mt-2 text-sm text-text-muted">
          Strip identifying metadata. Your file never leaves this device.
        </p>
      </header>

      {m.phase === "idle" && <DropZone onFile={m.load} />}

      {m.file && m.phase !== "idle" && (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <p className="font-mono text-sm text-text-muted">{COPY.fileReceived}</p>
            <FilePreview file={m.file} />
            <Button variant="ghost" onClick={m.reset}>
              Choose another file
            </Button>
          </div>

          <Card className="space-y-5">
            {m.phase === "unsupported" && <p className="text-sm text-danger">{m.note}</p>}
            {m.phase === "error" && <p className="text-sm text-danger">{COPY.error}</p>}

            {(m.phase === "scanning" || m.phase === "scanned" || m.phase === "purging") && (
              <>
                <MetadataScanner scanning={m.phase === "scanning"} traces={m.traces} />
                {m.phase !== "scanning" && (
                  <PurgeEngine
                    disabled={!!m.compromised}
                    purging={m.phase === "purging"}
                    count={m.threats.length}
                    onPurge={m.purge}
                  />
                )}
              </>
            )}

            {m.phase === "done" && m.result && (
              <>
                <BeforeAfter
                  result={m.result}
                  beforeThreats={m.threats.length}
                  afterThreats={m.remaining}
                  removed={m.removedThreats}
                  leftover={m.remainingTraces.filter((t) => !isThreatTrace(t))}
                  remainingAll={m.remainingTraces}
                />
                <CleanExport result={m.result} remaining={m.remaining} />
              </>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}