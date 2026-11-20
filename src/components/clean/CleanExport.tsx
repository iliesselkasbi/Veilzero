"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import IntegrityPanel from "@/components/ui/IntegrityPanel";
import { download } from "@/lib/fileUtils";
import type { CleanResult } from "@/types/pool";
import { buildResistanceDrop } from "@/lib/resistanceDrop";
import { generateSecureWordPassphrase } from "@/lib/passphrase";

export default function CleanExport({
  result,
  remaining,
  originalFile,
}: {
  result: CleanResult;
  remaining: number | null;
  originalFile?: File | null;
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
    if (result.blob.size > 256 * 1024 * 1024) {
      setNote("File exceeds the 256 MB browser-memory safety limit.");
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
          <>✓ Clean export ready — 0 identifying threats detected on re-scan.</>
        ) : (
          <>
            ⚠ {threatsLeft} residual threat{threatsLeft === 1 ? "" : "s"} still flagged. Prefer a
            screen-capture PNG or do not distribute.
          </>
        )}
      </div>

      <IntegrityPanel original={originalFile} output={result.blob} outputLabel="Cleaned" />

      {result.warnings?.map((warning) => (
        <p key={warning} className="rounded border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
          {warning}
        </p>
      ))}

      <Button
        onClick={() => download(result.blob, result.fileName)}
        className="w-full"
        disabled={!clean}
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
          Resistance Drop · Encrypt &amp; Burn
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
        {result.blob.size > 128 * 1024 * 1024 && (
          <p className="rounded border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
            Large file: unlocking decrypts the entire payload into browser memory.
          </p>
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
        <Button
          variant="secondary"
          className="w-full"
          disabled={busy || !clean}
          onClick={() => void exportDrop()}
        >
          {busy ? "Encrypting…" : "Generate encrypted Drop .html"}
        </Button>
        {note && <p className="font-mono text-[11px] text-text-muted" role="status" aria-live="polite">{note}</p>}
      </div>
    </div>
  );
}