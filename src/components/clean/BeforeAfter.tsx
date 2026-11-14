import { formatBytes } from "@/lib/fileUtils";
import type { CleanResult } from "@/types/pool";
import type { MetadataTrace } from "@/types/common";
import { isThreatTrace } from "@/lib/traceClass";

export default function BeforeAfter({
  result,
  beforeThreats,
  afterThreats,
  removed,
  leftover,
  remainingAll,
}: {
  result: CleanResult;
  beforeThreats: number;
  afterThreats: number | null;
  removed: MetadataTrace[];
  leftover: MetadataTrace[];
  remainingAll?: MetadataTrace[];
}) {
  const clean = afterThreats === 0;
  const residualThreats = (remainingAll ?? leftover).filter(isThreatTrace);
  const residualSafe = (remainingAll ?? leftover).filter((t) => !isThreatTrace(t));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="rounded-lg border border-border bg-surface-alt py-4">
          <div className="text-xs text-text-muted">Before</div>
          <div className="mt-1 font-mono text-xl text-danger">{beforeThreats}</div>
          <div className="text-xs text-text-muted">
            identifying threats · {formatBytes(result.originalSize)}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-surface-alt py-4">
          <div className="text-xs text-text-muted">After</div>
          <div className={`mt-1 font-mono text-xl ${clean ? "text-success" : "text-danger"}`}>
            {afterThreats ?? "–"}
          </div>
          <div className="text-xs text-text-muted">
            identifying threats · {formatBytes(result.cleanSize)}
          </div>
        </div>
      </div>

      {removed.length > 0 && (
        <div className="rounded-lg border border-success/30 bg-success/5 p-3">
          <p className="font-mono text-[11px] uppercase tracking-wide text-success">
            Removed ({removed.length})
          </p>
          <ul className="mt-2 max-h-28 overflow-auto space-y-1">
            {removed.map((t, i) => (
              <li key={`r-${t.key}-${i}`} className="font-mono text-xs text-text-muted">
                <span className="text-success">−</span> {t.key}
                <span className="opacity-50"> · {t.category}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {residualThreats.length > 0 && (
        <div className="rounded-lg border border-danger/40 bg-danger/10 p-3">
          <p className="font-mono text-[11px] uppercase tracking-wide text-danger">
            Residual threats ({residualThreats.length})
          </p>
          <ul className="mt-2 space-y-1">
            {residualThreats.map((t, i) => (
              <li key={`t-${t.key}-${i}`} className="font-mono text-xs text-danger">
                ! {t.key} · {t.category} · {t.value}
              </li>
            ))}
          </ul>
        </div>
      )}

      {residualSafe.length > 0 && (
        <div className="rounded-lg border border-border p-3">
          <p className="font-mono text-[11px] uppercase tracking-wide text-text-muted">
            Still present (non-identifying / structural)
          </p>
          <ul className="mt-2 max-h-24 overflow-auto space-y-1">
            {residualSafe.map((t, i) => (
              <li key={`l-${t.key}-${i}`} className="font-mono text-xs text-text-muted/70">
                · {t.key}
              </li>
            ))}
          </ul>
        </div>
      )}

      {clean ? (
        <p className="font-mono text-xs text-success">
          ✓ Identifying metadata purged. Structural headers (width/height/color) must remain for the
          file to open. Verify with `exiftool` if needed.
        </p>
      ) : (
        <p className="font-mono text-xs text-danger">
          Hard re-encode could not neutralize every tag. Treat as sensitive or re-export as new PNG
          screenshot.
        </p>
      )}
    </div>
  );
}