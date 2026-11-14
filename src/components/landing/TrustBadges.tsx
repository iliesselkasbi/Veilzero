const badges = ["No servers", "No accounts", "No logs", "0 KB sent"];

export default function TrustBadges() {
  return (
    <section className="border-y border-border">
      <ul className="mx-auto max-w-6xl px-6 py-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
        {badges.map((b) => (
          <li key={b} className="flex items-center gap-2 text-text-muted">
            <span className="h-2 w-2 rounded-sm bg-primary" aria-hidden />
            {b}
          </li>
        ))}
      </ul>
    </section>
  );
}
