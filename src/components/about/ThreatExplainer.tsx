import Card from "@/components/ui/Card";
import { THREATS, LIMITS } from "@/config/threats";

export default function ThreatExplainer() {
  return (
    <div className="space-y-10">
      <div>
        <h2 className="font-display text-2xl font-bold tracking-wide">What gives you away</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {THREATS.map((t) => (
            <Card key={t.title}>
              <h3 className="font-medium text-primary">{t.title}</h3>
              <p className="mt-2 text-sm text-text-muted leading-relaxed">{t.body}</p>
            </Card>
          ))}
        </div>
      </div>
      <div>
        <h2 className="font-display text-2xl font-bold tracking-wide">What VEILZERO does not do</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-text-muted">
          {LIMITS.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
