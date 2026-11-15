"use client";

import { useEffect, useRef, useState } from "react";
import { createVoiceChain, type VoiceChain } from "@/lib/audioChain";
import { DEFAULT_AUDIO_PRESET } from "@/config/audioPresets";
import type { AudioPreset } from "@/types/stream";

export function useVoice(mic: MediaStream | null) {
  const chain = useRef<VoiceChain | null>(null);
  const [preset, setPresetState] = useState<AudioPreset>(DEFAULT_AUDIO_PRESET);
  const [processed, setProcessed] = useState<MediaStream | null>(null);
  const [muted, setMutedState] = useState(false);
  const presetRef = useRef(preset);
  presetRef.current = preset;

  useEffect(() => {
    if (!mic || mic.getAudioTracks().length === 0) {
      setProcessed(null);
      return;
    }
    const c = createVoiceChain(mic, presetRef.current);
    chain.current = c;
    setProcessed(c.stream);
    return () => {
      c.dispose();
      chain.current = null;
      setProcessed(null);
    };
  }, [mic]);

  const setPreset = (p: AudioPreset) => {
    setPresetState(p);
    chain.current?.setPreset(p);
  };

  const setMuted = (m: boolean) => {
    setMutedState(m);
    chain.current?.setMuted(m);
  };

  return { processed, preset, setPreset, muted, setMuted, analyser: chain.current?.analyser ?? null };
}
