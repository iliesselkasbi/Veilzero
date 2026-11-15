import type { MetadataTrace } from "@/types/common";
import Badge from "@/components/ui/Badge";
import { COPY } from "@/lib/constants";
import { partitionTraces } from "@/lib/traceClass";

const tone: Record<MetadataTrace["category"], "danger" | "primary" | "neutral"> = {
  location: "danger",
  identity: "danger",
  device: "primary",
  time: "primary",
  software: "neutral",
  other: "neutral",
};

export default function MetadataScanner({
  scanning,
  traces,
}: {
  scanning: boolean;
  traces: MetadataTrace[];
}) {
  if (scanning) {
    return <p className="font-mono text-sm text-text-muted animate-pulse">{COPY.scanning}</p>;
  }

  const { threats, structural, compromised } = partitionTraces(traces);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 border-b border-border pb-2">
        {compromised ? (
          <span className="font-mono text-sm font-bold text-danger animate-pulse">
            ⚠️ FILE CORRUPTED / COMPROMISED
          </span>
        ) : (
          <>
            <span className="font-mono text-sm font-bold text-danger">
              ⚠️ {threats.length} THREAT{threats.length === 1 ? "" : "S"} DETECTED
            </span>
            <span className="text-text-muted">|</span>
            <span className="font-mono text-sm text-text-muted">
              {structural.length} structural (safe)
            </span>
          </>
        )}
      </div>

      {traces.length === 0 && (
        <p className="font-mono text-sm text-success">No metadata traces found.</p>
      )}

      {traces.length > 0 && (
        <ul className="mt-1 max-h-64 space-y-1.5 overflow-auto pr-1">
          {traces.map((t, i) => {
            const safe = !isThreatLocal(t);
            const danger =
              t.key === "⚠️ PARSE FAILURE" ||
              t.category === "location" ||
              t.category === "identity";

            return (
              <li
                key={`${t.key}-${i}`}
                className={`flex items-start justify-between gap-3 rounded-md border px-3 py-2 text-xs ${
                  safe
                    ? "border-border/50 bg-bg opacity-50"
                    : danger
                    ? "border-danger/30 bg-danger/10"
                    : "border-border bg-surface-alt"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Badge tone={safe ? "neutral" : tone[t.category]}>
                    {safe ? "STRUCTURAL" : t.category}
                  </Badge>
                  <span className={`font-mono ${safe ? "text-text-muted" : "text-text"}`}>
                    {t.key}
                  </span>
                </span>
                <span
                  className={`max-w-[50%] truncate ${
                    safe ? "text-text-muted/50" : "text-text-muted"
                  }`}
                  title={t.value}
                >
                  {t.value}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function isThreatLocal(t: MetadataTrace) {
  if (t.key === "⚠️ PARSE FAILURE") return true;
  const STRUCTURAL = new Set([
    "ImageWidth","ImageHeight","ImageLength","PixelXDimension","PixelYDimension",
    "ColorSpace","JFIFVersion","ResolutionUnit","XResolution","YResolution",
    "Xdensity","Ydensity","Orientation","BitsPerSample","BitDepth","ColorType",
    "Compression","Filter","Interlace","ThumbnailWidth","ThumbnailHeight",
  ]);
  return !STRUCTURAL.has(t.key);
}