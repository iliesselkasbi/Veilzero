"use client";

import { useEffect, useRef, useState } from "react";
import { useCamera } from "@/hooks/useCamera";
import { useFaceMesh } from "@/hooks/useFaceMesh";
import { useVoice } from "@/hooks/useVoice";
import { useRecorder } from "@/hooks/useRecorder";
import CameraFeed from "@/components/live/CameraFeed";
import StreamCanvas from "@/components/live/StreamCanvas";
import FaceStatus from "@/components/live/FaceMesh";
import { useMaskImages } from "@/components/live/MaskOverlay";
import MaskSelector from "@/components/live/MaskSelector";
import VoiceControls from "@/components/live/VoiceControls";
import StreamRecorder from "@/components/live/StreamRecorder";
import ExportModal from "@/components/live/ExportModal";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { COPY } from "@/lib/constants";
import { DEFAULT_MASK } from "@/config/masks";
import type { MaskId } from "@/types/stream";

export default function LivePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cam = useCamera();
  const cameraOn = cam.status === "active";
  const { faces, lastSeen, ready } = useFaceMesh(cam.videoRef, cameraOn);
  const images = useMaskImages();
  const voice = useVoice(cam.micStream);
  const rec = useRecorder(canvasRef, voice.processed);

  const [mask, setMask] = useState<MaskId>(DEFAULT_MASK.id);
  const [tracking, setTracking] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    if (rec.result) setExportOpen(true);
  }, [rec.result]);

  const stopAll = () => {
    rec.stop();
    cam.stop();
    setTracking(false);
  };

  const statusText =
    cam.status === "loading"
      ? COPY.cameraStarting
      : cam.status === "active"
      ? COPY.cameraActive
      : cam.status === "error"
      ? cam.denied
        ? COPY.noCamera
        : COPY.error
      : COPY.ready;

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <CameraFeed ref={cam.videoRef} />

      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-wide">VEILZERO LIVE</h1>
          <p className="mt-2 text-sm text-text-muted">
            Face and voice are cloaked before anything is recorded. Nothing leaves this device.
          </p>
        </div>
        <p className={`font-mono text-sm ${cam.status === "error" ? "text-danger" : "text-text-muted"}`}>{statusText}</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="relative">
            <StreamCanvas
              canvasRef={canvasRef}
              videoRef={cam.videoRef}
              faces={faces}
              lastSeen={lastSeen}
              images={images}
              meshReady={ready}
              active={cameraOn}
              mask={mask}
              onTrackingChange={setTracking}
            />
            {!cameraOn && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-xl bg-surface">
                <Button onClick={cam.start} disabled={cam.status === "loading"}>
                  {cam.status === "loading" ? COPY.cameraStarting : "Start camera"}
                </Button>
                {cam.status === "error" && (
                  <p className="text-sm text-danger">{cam.denied ? COPY.noCamera : COPY.error}</p>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <StreamRecorder
              recording={rec.recording}
              canRecord={cameraOn && tracking}
              done={!!rec.result}
              onStart={rec.start}
              onStop={rec.stop}
            />
            {cameraOn && (
              <Button variant="ghost" onClick={stopAll}>
                Stop camera
              </Button>
            )}
          </div>
          {cameraOn && !tracking && (
            <p className="text-xs text-text-muted">
              No face is being tracked, so the frame is hidden. Recording is available once a face is cloaked.
            </p>
          )}
          {rec.error && <p className="text-sm text-danger">{COPY.error}</p>}
        </div>

        <Card className="space-y-6 self-start">
          <FaceStatus cameraOn={cameraOn} tracking={tracking} />
          <MaskSelector value={mask} onChange={setMask} />
          <VoiceControls
            preset={voice.preset}
            onPreset={voice.setPreset}
            muted={voice.muted}
            onMuted={voice.setMuted}
            analyser={voice.analyser}
            active={!!voice.processed}
          />
        </Card>
      </div>

      <ExportModal
        result={rec.result}
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        onDiscard={rec.discard}
      />
    </div>
  );
}
