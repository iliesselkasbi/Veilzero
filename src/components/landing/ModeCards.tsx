import Link from "next/link";
import Card from "@/components/ui/Card";

const modes = [
  {
    href: "/live",
    name: "VEILZERO LIVE",
    body: "Webcam and mic in. Face mask and voice distortion applied in real time. Record and export.",
  },
  {
    href: "/clean",
    name: "VEILZERO CLEAN",
    body: "Drop a photo or video. Every identifying metadata trace is removed. Download a clean copy.",
  },
];

export default function ModeCards() {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-16 grid gap-4 sm:grid-cols-2">
      {modes.map((m) => (
        <Link key={m.href} href={m.href} className="group">
          <Card className="h-full transition-colors group-hover:border-primary-dim group-hover:shadow-glow">
            <h2 className="font-display text-xl font-bold tracking-wide">{m.name}</h2>
            <p className="mt-3 text-sm text-text-muted leading-relaxed">{m.body}</p>
            <span className="mt-6 inline-block text-sm text-primary">Open →</span>
          </Card>
        </Link>
      ))}
    </section>
  );
}
