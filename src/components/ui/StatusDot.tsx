type Tone = "off" | "active" | "recording" | "error";

const tones: Record<Tone, string> = {
  off: "bg-text-muted",
  active: "bg-success",
  recording: "bg-danger animate-pulse-red",
  error: "bg-danger",
};

export default function StatusDot({ tone = "off" }: { tone?: Tone }) {
  return <span className={`inline-block h-2 w-2 rounded-full ${tones[tone]}`} aria-hidden />;
}
