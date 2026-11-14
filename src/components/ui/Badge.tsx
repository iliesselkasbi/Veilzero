import type { ReactNode } from "react";

type Tone = "neutral" | "primary" | "success" | "danger";

const tones: Record<Tone, string> = {
  neutral: "border-border text-text-muted",
  primary: "border-primary-dim text-primary",
  success: "border-success/40 text-success",
  danger: "border-danger/40 text-danger",
};

export default function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-mono ${tones[tone]}`}>
      {children}
    </span>
  );
}
