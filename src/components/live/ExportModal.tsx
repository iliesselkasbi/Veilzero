"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import IntegrityPanel from "@/components/ui/IntegrityPanel";
import { COPY } from "@/lib/constants";
import { download, formatBytes } from "@/lib/fileUtils";
import type { RecordingResult } from "@/types/stream";
import {
  buildResistanceDrop,
  type DropPreset,
} from "@/lib/resistanceDrop";
import { burnObjectUrls } from "@/lib/burn";
import { generateSecureWordPassphrase } from "@/lib/passphrase";

interface Props {
  result: RecordingResult | null;
  open: boolean;
  onClose: () => void;
  onDiscard: () => void;
}

const EVIDENCE_OPTIONS = [
  { id: "TAINTED_WATER_PROOF", label: "Contaminated water" },
  { id: "OUTBREAK_CLUSTER", label: "Lung sickness cluster" },
  { id: "SURFACE_ATMOSPHERE_SAFE", label: "Surface air claim" },
  { id: "BLACKOUT_AIR_CUT", label: "Air supply cutoff" },
] as const;

export default function ExportModal({ result, open, onClose, onDiscard }: Props) {
  const [password, setPassword] = useState("");
  const [stealth, setStealth] = useState(true);
  const [preset, setPreset] = useState<DropPreset>("standard");
  const [level, setLevel] = useState("Level 12 · Deep");
  const [status, setStatus] = useState("Alive · need medicine");
  const [category, setCategory] = useState<string>(EVIDENCE_OPTIONS[0].id);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  if (!result) return null;

  const ext = result.mimeType.includes("mp4") ? "mp4" : "webm";
  const secs = Math.round(result.durationMs / 1000);

  async function exportDrop() {
    if (!result) return;
    if (!password || password.length < 12) {
      setNote("Passphrase must be at least 12 characters.");
      return;
    }
    if (result.blob.size > 256 * 1024 * 1024) {
      setNote("Recording exceeds the 256 MB browser-memory safety limit.");
      return;
    }
    setBusy(true);
    setNote("Encrypting resistance drop…");
    try {
      const html = await buildResistanceDrop({
        blob: result.blob,
        fileName: `veilzero-live-${Date.now()}.${ext}`,
        password,
        kind: "live",
        stealth,
        meta: {
          preset,
          level: preset === "family_pulse" ? level : undefined,
          status: preset === "family_pulse" ? status : undefined,
          category: preset === "evidence" ? category : undefined,
        },
      });
      download(html, `veilzero-${preset}-${Date.now()}.html`);
      setNote("Drop ready. Share the passphrase on a separate channel.");
    } catch (e) {
      console.error(e);
      setNote("Encryption failed.");
    } finally {
      setBusy(false);
    }
  }

  function discardAndBurn() {
    if (!result) return;
    burnObjectUrls(result.url);
    onDiscard();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={COPY.recordingDone}>
      {/* CRITICAL: scrollable body so Generate is always reachable */}
      <div className="max-h-[min(70vh,640px)] overflow-y-auto overscroll-contain pr-1 space-y-4">
        <video
          src={result.url}
          controls
          className="w-full rounded-lg border border-border bg-black"
        />
        <p className="font-mono text-xs text-text-muted">
          {secs}s · {formatBytes(result.blob.size)} · .{ext}
        </p>
        {result.blob.size > 128 * 1024 * 1024 && (
          <p className="rounded border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
            This recording is large. Unlocking it decrypts the whole file into browser memory and may exhaust a mobile device.
          </p>
        )}
        <p className="text-xs text-text-muted">
          Exported WebM files are not remuxed; encoder strings and container timestamps may remain.
          Test any sensitive export before distribution.
        </p>

        <IntegrityPanel output={result.blob} outputLabel="Recording" />

        <div className="flex gap-3">
          <Button
            className="flex-1"
            onClick={() => download(result.blob, `veilzero-${Date.now()}.${ext}`)}
          >
            {COPY.export} raw
          </Button>
          <Button variant="secondary" onClick={discardAndBurn}>
            Burn clip
          </Button>
        </div>

        <div className="rounded-lg border border-border bg-surface-alt p-3 space-y-3">
          <p className="font-mono text-[11px] uppercase tracking-wide text-primary">
            Resistance drop · encrypt &amp; burn
          </p>

          <div className="grid grid-cols-3 gap-2 text-xs font-mono">
            {(
              [
                ["standard", "Standard"],
                ["family_pulse", "Family pulse"],
                ["evidence", "Evidence"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setPreset(id)}
                className={`p-1.5 rounded border ${
                  preset === id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-text-muted"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {preset === "family_pulse" && (
            <div className="space-y-2 text-xs font-mono">
              <input
                type="text"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                placeholder="Level / location"
                className="w-full rounded border border-border bg-bg px-2.5 py-1.5 outline-none"
              />
              <input
                type="text"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                placeholder="Family status"
                className="w-full rounded border border-border bg-bg px-2.5 py-1.5 outline-none"
              />
            </div>
          )}

          {preset === "evidence" && (
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded border border-border bg-bg px-2.5 py-1.5 text-xs font-mono outline-none text-text"
            >
              {EVIDENCE_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          )}

          <div className="flex gap-2">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={12}
              autoComplete="new-password"
              placeholder="Shared passphrase"
              className="min-w-0 flex-1 rounded border border-border bg-bg px-3 py-2 font-mono text-sm outline-none focus:border-primary"
            />
            <Button
              variant="ghost"
              type="button"
              onClick={() => setPassword(generateSecureWordPassphrase())}
            >
              Generate
            </Button>
          </div>
          <p className="text-[11px] text-text-muted">
            Generate creates a 12-word passphrase from six independently selected word pairs.
          </p>
          <label className="flex items-start gap-2 text-xs text-text-muted">
            <input
              type="checkbox"
              checked={stealth}
              onChange={(e) => setStealth(e.target.checked)}
              className="mt-0.5 accent-primary"
            />
            <span>
              Stealth drop — hide filename and metadata until unlocked
              {!stealth && " (normal mode keeps these visible without the passphrase)"}
            </span>
          </label>

          <Button
            className="w-full"
            variant="secondary"
            disabled={busy}
            onClick={() => void exportDrop()}
          >
            {busy ? "Encrypting…" : "Generate encrypted drop .html"}
          </Button>
          {note && <p className="font-mono text-[11px] text-text-muted" role="status" aria-live="polite">{note}</p>}
        </div>
      </div>
    </Modal>
  );
}