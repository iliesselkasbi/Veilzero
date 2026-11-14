import type { ReactNode } from "react";

export default function Tooltip({ text, children }: { text: string; children: ReactNode }) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-surface-alt px-2 py-1 text-xs text-text opacity-0 transition-opacity group-hover:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}
