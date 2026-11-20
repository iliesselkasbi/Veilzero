import HowItWorks from "@/components/about/HowItWorks";
import ThreatExplainer from "@/components/about/ThreatExplainer";
import NetworkMonitor from "@/components/about/NetworkMonitor";

export const metadata = { title: "About — VEILZERO" };

export default function About() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16 space-y-14">
      <header className="space-y-4">
        <p className="font-mono text-xs tracking-[0.2em] text-primary">
          FIELD MANUAL // SECTOR UNREGISTERED
        </p>
        <h1 className="font-display text-4xl font-bold tracking-wide">
          About VEILZERO
        </h1>
        <p className="max-w-2xl text-text-muted leading-relaxed">
          The Directorate does not need your confession. It needs a face in a hallway
          frame, a voice on a ration line, or a hidden data still stuck inside a photo.
          Down here in the Hollow - two billion under rock, blackouts on the hour,
          recyclers coughing sludge - the network is not a utility. It is a census.
        </p>
        <p className="max-w-2xl text-text-muted leading-relaxed">
          VEILZERO is off-grid coordination gear. Faces cloaked on-device. Voices bent in
          the browser. Metadata burned before a packet can form. Resistance Drops seal as
          encrypted HTML you can hand across a dead-air gap. Nothing uploads. Nothing phones
          home. If the lights die mid-transfer, the work stays on the machine that made it.
        </p>
      </header>

      <HowItWorks />
      <ThreatExplainer />
      <NetworkMonitor />
    </div>
  );
}