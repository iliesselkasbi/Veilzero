interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}

export default function Slider({ label, value, min, max, step = 1, onChange }: Props) {
  return (
    <label className="block text-sm">
      <span className="mb-1 flex justify-between text-text-muted">
        <span>{label}</span>
        <span className="font-mono">{value}</span>
      </span>
      <input
        type="range"
        className="w-full"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
