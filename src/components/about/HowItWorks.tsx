const rows = [
  [
    "Face",
    "Hides faces in the camera feed on your device. If the tracker loses you, the screen goes black so a raw face never gets saved.",
  ],
  [
    "Voice",
    "Changes how your voice sounds in the browser (pitch/timbre). Nothing is sent to a server to do this.",
  ],
  [
    "Files",
    "Removes identifying metadata from photos (GPS, device names, timestamps). Harmless technical tags are left alone and labeled safe.",
  ],
  [
    "Drops",
    "Packages media into an encrypted HTML file (AES-256-GCM) you can open offline and clear from view with the BURN VIEW control.",
  ],
  [
    "Blackout",
    "Works as an installable offline app so you can keep using it when the network is down.",
  ],
];

export default function HowItWorks() {
  return (
    <div>
      <h2 className="font-display text-2xl font-bold tracking-wide">How it works</h2>
      <p className="mt-2 max-w-2xl text-sm text-text-muted leading-relaxed">
        VEILZERO runs in five local steps. There is no account and no upload. Media is
        handled on this device only — built for life in the Hollow, where the official
        network is watched and power cuts are routine.
      </p>
      <dl className="mt-6 divide-y divide-border rounded-xl border border-border bg-surface">
        {rows.map(([k, v]) => (
          <div
            key={k}
            className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-8"
          >
            <dt className="shrink-0 font-mono text-sm text-primary">{k}</dt>
            <dd className="text-sm text-text-muted leading-relaxed sm:text-right">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}