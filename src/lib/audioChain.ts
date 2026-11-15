import type { AudioPreset } from "@/types/stream";

/**
 * Web Audio voice distortion chain. Pure Web Audio, no network.
 *
 * mic -> highpass -> pitch shifter (two crossfaded modulated delay lines)
 *     -> formant filters -> ring-mod texture (wet/dry) -> compressor -> output
 *
 * There is deliberately no raw-voice path to the output. "Bypass" mutes the
 * output instead, so a bug can never leak the unprocessed voice.
 */
export interface VoiceChain {
  stream: MediaStream;
  setPreset: (p: AudioPreset) => void;
  setMuted: (m: boolean) => void;
  analyser: AnalyserNode;
  dispose: () => void;
}

const WINDOW = 0.08; // seconds, length of one delay sweep
const TABLE = 4096;

/** Looping buffers: a 0..1 ramp and a sin(pi * ramp) crossfade window, optionally phase shifted. */
function makeTables(ctx: AudioContext, shift: number) {
  const ramp = ctx.createBuffer(1, TABLE, ctx.sampleRate);
  const win = ctx.createBuffer(1, TABLE, ctx.sampleRate);
  const r = ramp.getChannelData(0);
  const w = win.getChannelData(0);
  for (let i = 0; i < TABLE; i++) {
    const phase = ((i + shift) % TABLE) / TABLE;
    r[i] = phase;
    w[i] = Math.sin(Math.PI * phase);
  }
  return { ramp, win };
}

export function createVoiceChain(input: MediaStream, preset: AudioPreset): VoiceChain {
  const AC = window.AudioContext || (window as any).webkitAudioContext;
  const ctx: AudioContext = new AC();
  const src = ctx.createMediaStreamSource(input);
  const dest = ctx.createMediaStreamDestination();

  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 90;
  src.connect(hp);

  // ---- Pitch shifter ------------------------------------------------------
  const shifted = ctx.createGain();
  shifted.gain.value = 1;

  const voices = [0, TABLE / 2].map((shift) => {
    const { ramp, win } = makeTables(ctx, shift);
    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0;

    const rampSrc = ctx.createBufferSource();
    rampSrc.buffer = ramp;
    rampSrc.loop = true;
    const depth = ctx.createGain();
    depth.gain.value = 0;
    rampSrc.connect(depth);
    depth.connect(delay.delayTime);

    const winSrc = ctx.createBufferSource();
    winSrc.buffer = win;
    winSrc.loop = true;
    const fade = ctx.createGain();
    fade.gain.value = 0;
    winSrc.connect(fade.gain);

    hp.connect(delay);
    delay.connect(fade);
    fade.connect(shifted);

    rampSrc.start();
    winSrc.start();
    return { delay, rampSrc, winSrc, depth };
  });

  // ---- Formant shaping ----------------------------------------------------
  const f1 = ctx.createBiquadFilter();
  f1.type = "peaking";
  f1.Q.value = 2;
  f1.gain.value = 6;
  const f2 = ctx.createBiquadFilter();
  f2.type = "peaking";
  f2.Q.value = 2;
  f2.gain.value = 5;
  shifted.connect(f1);
  f1.connect(f2);

  // ---- Ring-mod texture ---------------------------------------------------
  const carrier = ctx.createOscillator();
  carrier.type = "sine";
  carrier.frequency.value = 55;
  const ring = ctx.createGain();
  ring.gain.value = 0;
  carrier.connect(ring.gain);
  carrier.start();
  const dry = ctx.createGain();
  const wet = ctx.createGain();
  f2.connect(dry);
  f2.connect(ring);
  ring.connect(wet);

  const comp = ctx.createDynamicsCompressor();
  const out = ctx.createGain();
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  dry.connect(comp);
  wet.connect(comp);
  comp.connect(out);
  out.connect(analyser);
  out.connect(dest);

  const apply = (p: AudioPreset) => {
    const t = ctx.currentTime;
    const ratio = Math.pow(2, p.pitch / 12);
    // Delay slope = 1 - ratio. Sweep rate (Hz) = |slope| / WINDOW.
    const slope = 1 - ratio;
    const rate = Math.max(Math.abs(slope) / WINDOW, 0.01);
    const playbackRate = (rate * TABLE) / ctx.sampleRate;
    const up = slope < 0; // pitching up needs a descending delay sweep
    for (const v of voices) {
      v.rampSrc.playbackRate.setTargetAtTime(playbackRate, t, 0.05);
      v.winSrc.playbackRate.setTargetAtTime(playbackRate, t, 0.05);
      v.depth.gain.setTargetAtTime(up ? -WINDOW : WINDOW, t, 0.05);
      v.delay.delayTime.setTargetAtTime(up ? WINDOW : 0, t, 0.05);
    }
    f1.frequency.setTargetAtTime(500 + p.formant * 900, t, 0.05);
    f2.frequency.setTargetAtTime(1800 + p.formant * 1600, t, 0.05);
    wet.gain.setTargetAtTime(p.texture, t, 0.05);
    dry.gain.setTargetAtTime(1 - p.texture * 0.6, t, 0.05);
  };
  apply(preset);

  return {
    stream: dest.stream,
    analyser,
    setPreset: apply,
    setMuted: (m: boolean) => out.gain.setTargetAtTime(m ? 0 : 1, ctx.currentTime, 0.02),
    dispose: () => {
      try {
        carrier.stop();
        voices.forEach((v) => {
          v.rampSrc.stop();
          v.winSrc.stop();
        });
      } catch {}
      src.disconnect();
      dest.stream.getTracks().forEach((t) => t.stop());
      ctx.close();
    },
  };
}
