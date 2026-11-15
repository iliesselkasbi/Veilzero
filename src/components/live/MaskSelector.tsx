import { MASKS } from "@/config/masks";
import type { MaskId } from "@/types/stream";

export default function MaskSelector({ value, onChange }: { value: MaskId; onChange: (m: MaskId) => void }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm text-text-muted">Mask</legend>
      <div className="grid grid-cols-5 gap-2">
        {MASKS.map((m) => (
          <button
            key={m.id}
            onClick={() => onChange(m.id)}
            aria-pressed={value === m.id}
            className={`rounded-lg border px-2 py-2 text-xs transition-colors ${
              value === m.id
                ? "border-primary text-primary bg-surface-alt"
                : "border-border text-text-muted hover:border-primary-dim"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
