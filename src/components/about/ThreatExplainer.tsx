import Card from "@/components/ui/Card";
import { THREATS, LIMITS } from "@/config/threats";

export default function ThreatExplainer() {
  return (
    <div className="space-y-10">
      <div>
        <h2 className="font-display text-2xl font-bold tracking-wide">
          What gives you away
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-text-muted">
          In the Hollow they do not chase ghosts. They chase leftovers -
          a voiceprint from a clinic queue, a device model, a timestamp.
          What usually gives people away is not the main picture -
          it is leftovers: GPS in a file header, a device model, a timestamp, a face,
          or a voice that can be matched later. VEILZERO targets those signals.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {THREATS.map((t) => (
            <Card key={t.title}>
              <h3 className="font-medium text-primary">{t.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-muted">{t.body}</p>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h2 className="font-display text-2xl font-bold tracking-wide">
          What VEILZERO does not do
        </h2>
        <p className="mt-2 text-sm text-text-muted">
          Tools lie when they promise absolution. Read the limits before you trust a drop.
        </p>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-text-muted">
          {LIMITS.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}