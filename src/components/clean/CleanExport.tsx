"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { download } from "@/lib/fileUtils";
import type { CleanResult } from "@/types/pool";
import { buildResistanceDrop } from "@/lib/resistanceDrop";

export default function CleanExport({
  result,
  remaining,
}: {
  result: CleanResult;
  remaining: number | null;
}) {
  const threatsLeft = remaining ?? 0;
  const clean = threatsLeft === 0;
  const [password, setPassword] = useState("");
  const [stealth, setStealth] = useState(true);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  async function exportDrop() {
    if (!password || password.length < 12) {
      setNote("Passphrase must be at least 12 characters.");
      return;
    }
    setBusy(true);
    setNote("Encrypting Resistance Drop…");
    try {
      const html = await buildResistanceDrop({
        blob: result.blob,
        fileName: result.fileName,
        password,
        kind: "clean",
        stealth,
      });
      download(html, `veilzero-drop-${Date.now()}.html`);
      setNote("Drop ready. Share the passphrase on a separate channel.");
    } catch (e) {
      console.error(e);
      setNote("Encryption failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div
        className={`rounded-lg border px-3 py-2 font-mono text-sm ${
          clean
            ? "border-success/40 bg-success/10 text-success"
            : "border-danger/40 bg-danger/10 text-danger"
        }`}
      >
        {clean ? (
          <>✓ Output differs from original. Verification found 0 threats, subject to rescan limits.</>
        ) : (
          <>
            ⚠ {threatsLeft} residual threat{threatsLeft === 1 ? "" : "s"} still flagged. Prefer a
            screen-capture PNG or do not distribute.
          </>
        )}
      </div>

      <Button
        onClick={() => download(result.blob, result.fileName)}
        className="w-full"
        disabled={!clean}
        title={clean ? "Download cleaned file" : "Blocked while residual threats remain"}
      >
        {clean ? "Download cleaned file" : "Download blocked until clean"}
      </Button>

      {!clean && (
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => download(result.blob, `UNSAFE-${result.fileName}`)}
        >
          Force download anyway (marked UNSAFE-)
        </Button>
      )}

      <div className="rounded-lg border border-border bg-surface-alt p-3 space-y-2">
        <p className="font-mono text-[11px] uppercase tracking-wide text-primary">
          Resistance Drop · Encrypted export
        </p>
        <p className="text-xs text-text-muted">
          Password-locked HTML dead-drop. Works offline. No servers.
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
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Shared passphrase"
          className="w-full rounded border border-border bg-bg px-3 py-2 font-mono text-sm outline-none focus:border-primary"
        />
        <Button
          variant="secondary"
          className="w-full"
          disabled={busy || !clean}
          onClick={() => void exportDrop()}
        >
          {busy ? "Encrypting…" : "Generate encrypted Drop .html"}
        </Button>
        {note && <p className="font-mono text-[11px] text-text-muted">{note}</p>}
      </div>
    </div>
  );
}