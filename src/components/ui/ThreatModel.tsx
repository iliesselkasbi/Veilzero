const PROTECTS = [
  "Reducing face and voice identifying detail (mask + processed audio)",
  "EXIF/XMP/IPTC identity, device, GPS, timestamps (Clean)",
  "Server-side logging of raw media (the app does not upload source media)",
  "Casual network exfil during session (on-page request HUD)",
];

const DOES_NOT = [
  "Strong face recognition in every lighting or pose",
  "Forensic reversal resistance for voice pitch/formant changes",
  "Someone filming your screen with another camera",
  "Endpoint malware / browser compromise",
  "Your own words, handwriting style, clothing, room background",
  "Traffic analysis by your ISP while downloading the app itself",
  "Legal compulsion after you voluntarily share a decrypted drop",
];

export default function ThreatModel({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`rounded-lg border border-border bg-surface-alt ${compact ? "p-3" : "p-4"}`}>
      <p className="font-mono text-[11px] uppercase tracking-wide text-primary">
        Threat model · classified scope
      </p>
      <div className={`mt-3 grid gap-3 ${compact ? "" : "md:grid-cols-2"}`}>
        <div>
          <p className="font-mono text-xs text-success mb-1">Protects against</p>
          <ul className="space-y-1">
            {PROTECTS.map((x) => (
              <li key={x} className="text-xs text-text-muted leading-snug">
                <span className="text-success">+</span> {x}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-mono text-xs text-danger mb-1">Does not protect against</p>
          <ul className="space-y-1">
            {DOES_NOT.map((x) => (
              <li key={x} className="text-xs text-text-muted leading-snug">
                <span className="text-danger">−</span> {x}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}