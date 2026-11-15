const rows = [
  ["Face", "Cloaked via on-device ML"],
  ["Voice", "Distorted via Web Audio"],
  ["Files", "Metadata stripped locally"],
];

export default function HowItWorks() {
  return (
    <div>
      <h2 className="font-display text-2xl font-bold tracking-wide">How it works</h2>
      <dl className="mt-6 divide-y divide-border rounded-xl border border-border bg-surface">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between px-5 py-4 text-sm">
            <dt className="font-mono text-primary">{k}</dt>
            <dd className="text-text-muted">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
