import Link from "next/link";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-20">
      <header className="mb-16 max-w-3xl space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#00FF41]/30 bg-[#00FF41]/10 px-3 py-1 font-mono text-xs text-[#00FF41]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#00FF41]"></span>
          OFF-GRID COORDINATION LAYER · ACTIVE
        </div>
        <h1 className="font-display text-4xl font-bold tracking-wide md:text-6xl text-text">
          THE DIRECTORATE CONTROLS THE NETWORK. <br/>
          <span className="text-text-muted">WE CONTROL THE TRUTH.</span>
        </h1>
        <p className="text-lg text-text-muted">
          When the deep levels blackout and the water recyclers fail, official numbers lie.
          VEILZERO is an off-grid privacy toolkit. Obscure identifying details, strip metadata
          data from evidence, and generate password-locked Resistance Drops. No uplink required.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="group relative overflow-hidden rounded-xl border border-border bg-surface-alt p-8 transition-colors hover:border-[#00FF41]/50">
          <div className="mb-4 font-mono text-xs tracking-widest text-[#00FF41]">MODULE 01</div>
          <h2 className="mb-2 font-display text-2xl font-bold">WITNESS CAM (LIVE)</h2>
          <p className="mb-6 text-sm text-text-muted">
            Document conditions and evidence with on-device face masking and voice transformation.
            These techniques reduce identifying detail but are not proven to defeat recognition.
            The processed frame is hidden when face tracking is lost.
          </p>
          <Link
            href="/live"
            className="inline-block border border-[#00FF41]/50 px-4 py-2 font-mono text-sm text-[#00FF41] hover:bg-[#00FF41]/10"
          >
            INITIALIZE CAM →
          </Link>
        </div>

        <div className="group relative overflow-hidden rounded-xl border border-border bg-surface-alt p-8 transition-colors hover:border-[#00FF41]/50">
          <div className="mb-4 font-mono text-xs tracking-widest text-[#00FF41]">MODULE 02</div>
          <h2 className="mb-2 font-display text-2xl font-bold">EVIDENCE SCRUB</h2>
          <p className="mb-6 text-sm text-text-muted">
            Strip Directorate tracking data, device serials, and GPS location from captured media.
            Wraps neutralized files into encrypted HTML Resistance Drops for hand-to-hand sharing during blackouts.
          </p>
          <Link
            href="/clean"
            className="inline-block border border-[#00FF41]/50 px-4 py-2 font-mono text-sm text-[#00FF41] hover:bg-[#00FF41]/10"
          >
            SCRUB MEDIA →
          </Link>
        </div>
      </div>

      <div className="mt-16 rounded-xl border border-border bg-black p-8 font-mono text-sm text-text-muted">
        <h3 className="mb-4 text-[#00FF41] uppercase tracking-wide">Survival Protocol</h3>
        <ul className="space-y-2">
          <li>&gt; Network observations are best-effort and do not prove that no traffic occurred.</li>
          <li>&gt; Offline operation depends on the app shell and assets being cached first.</li>
          <li>&gt; Panic / Burn functions active on all secure tabs.</li>
          <li>&gt; Do not trust unofficial water safety reports unless secured via Resistance Drop.</li>
        </ul>
      </div>
    </div>
  );
}