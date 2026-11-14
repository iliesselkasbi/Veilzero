import Badge from "@/components/ui/Badge";
import StatusDot from "@/components/ui/StatusDot";
import VoiceProcessor from "./VoiceProcessor";
import { AUDIO_PRESETS } from "@/config/audioPresets";
import { COPY } from "@/lib/constants";
import type { AudioPreset } from "@/types/stream";

interface Props {
  preset: AudioPreset;
  onPreset: (p: AudioPreset) => void;
  muted: boolean;
  onMuted: (m: boolean) => void;
  analyser: AnalyserNode | null;
  active: boolean;
}

export default function VoiceControls({ preset, onPreset, muted, onMuted, analyser, active }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-text-muted">Voice</span>
        {active ? (
          <Badge tone={muted ? "neutral" : "success"}>
            <StatusDot tone={muted ? "off" : "active"} />
            {muted ? "Voice: Muted" : COPY.voiceDistorted}
          </Badge>
        ) : (
          <Badge>Voice: Off</Badge>
        )}
      </div>
      <div className="grid grid-cols-4 gap-2">
        {AUDIO_PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => onPreset(p)}
            aria-pressed={preset.id === p.id}
            className={`rounded-lg border px-2 py-2 text-xs transition-colors ${
              preset.id === p.id
                ? "border-primary text-primary bg-surface-alt"
                : "border-border text-text-muted hover:border-primary-dim"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <VoiceProcessor analyser={analyser} />
      <label className="flex items-center gap-2 text-sm text-text-muted">
        <input type="checkbox" checked={muted} onChange={(e) => onMuted(e.target.checked)} />
        Mute audio in recording
      </label>
    </div>
  );
}
