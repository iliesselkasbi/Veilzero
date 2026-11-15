"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import IntegrityPanel from "@/components/ui/IntegrityPanel";
import { COPY } from "@/lib/constants";
import { download, formatBytes } from "@/lib/fileUtils";
import type { RecordingResult } from "@/types/stream";
import { buildResistanceDrop } from "@/lib/resistanceDrop";
import { burnObjectUrls } from "@/lib/burn";

interface Props {
  result: RecordingResult | null;
  open: boolean;
  onClose: () => void;
  onDiscard: () => void;
}

export default function ExportModal({ result, open, onClose, onDiscard }: Props) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  if (!result) return null;
  const ext = result.mimeType.includes("mp4") ? "mp4" : "webm";
  const secs = Math.round(result.durationMs / 1000);

  async function exportDrop() {
    if (!password || password.length < 4) {
      setNote("Password must be at least 4 characters.");
      return;
    }
    setBusy(true);
    setNote("Encrypting Resistance Drop…");
    try {
      const html = await buildResistanceDrop({
        blob: result.blob,
        fileName: `veilzero-live-${Date.now()}.${ext}`,
        password,
        kind: "live",
      });
      download(html, `veilzero-drop-${Date.now()}.html`);
      setNote("Drop ready. Send passphrase on a different channel.");
    } catch (e) {
      console.error(e);
      setNote("Encryption failed.");
    } finally {
      setBusy(false);
    }
  }

  function discardAndBurn() {
    burnObjectUrls(result.url);
    onDiscard();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={COPY.recordingDone}>
      <video src={result.url} controls className="w-full rounded-lg border border-border bg-black" />
      <p className="mt-3 font-mono text-xs text-text-muted">
        {secs}s · {formatBytes(result.blob.size)} · .{ext}
      </p>

      <div className="mt-3">
        <IntegrityPanel output={result.blob} outputLabel="Recording" />
      </div>

      <div className="mt-5 flex gap-3">
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

      <div className="mt-4 rounded-lg border border-border bg-surface-alt p-3 space-y-2">
        <p className="font-mono text-[11px] uppercase tracking-wide text-primary">
          Resistance Drop · Encrypt &amp; Burn
        </p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Shared passphrase"
          className="w-full rounded border border-border bg-bg px-3 py-2 font-mono text-sm outline-none focus:border-primary"
        />
        <Button
          className="w-full"
          variant="secondary"
          disabled={busy}
          onClick={() => void exportDrop()}
        >
          {busy ? "Encrypting…" : "Generate encrypted Drop .html"}
        </Button>
        {note && <p className="font-mono text-[11px] text-text-muted">{note}</p>}
      </div>
    </Modal>
  );
}