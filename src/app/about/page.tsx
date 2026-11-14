import HowItWorks from "@/components/about/HowItWorks";
import ThreatExplainer from "@/components/about/ThreatExplainer";
import NetworkMonitor from "@/components/about/NetworkMonitor";

export const metadata = { title: "About — VEILZERO" };

export default function About() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16 space-y-14">
      <header>
        <h1 className="font-display text-4xl font-bold tracking-wide">About</h1>
        <p className="mt-3 text-text-muted">
          VEILZERO removes identifying signals from media before it leaves your device. Everything runs in your
          browser. Nothing is uploaded.
        </p>
      </header>
      <HowItWorks />
      <ThreatExplainer />
      <NetworkMonitor />
    </div>
  );
}
