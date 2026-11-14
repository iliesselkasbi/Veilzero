"use client";

interface Props {
  recording: boolean;
  disabled: boolean;
  onStart: () => void;
  onStop: () => void;
}

export default function RecordButton({ recording, disabled, onStart, onStop }: Props) {
  return (
    <button
      onClick={recording ? onStop : onStart}
      disabled={disabled}
      aria-label={recording ? "Stop recording" : "Start recording"}
      className={`flex h-14 w-14 items-center justify-center rounded-full border-2 border-text transition-colors disabled:opacity-40 ${
        recording ? "animate-pulse-red" : "hover:border-danger"
      }`}
    >
      <span className={`bg-danger transition-all ${recording ? "h-5 w-5 rounded-sm" : "h-8 w-8 rounded-full"}`} />
    </button>
  );
}
