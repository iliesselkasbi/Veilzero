import type { MaskId } from "@/types/stream";
import { FACE_OVAL, boundingBox, expand, toPixels, tracePath } from "./canvasUtils";

type Landmarks = { x: number; y: number; z?: number }[];

export interface DrawOptions {
  ctx: CanvasRenderingContext2D;
  video: CanvasImageSource;
  width: number;
  height: number;
  faces: Landmarks[];
  mask: MaskId;
  images: Partial<Record<MaskId, HTMLImageElement>>;
  /** True when no face is currently tracked. Frame is then fully obscured. */
  failClosed: boolean;
}

/**
 * Draws one composited frame. The raw camera frame is never shown unless a face
 * mask has been applied or (when failClosed is false) there is nothing to cloak.
 *
 * Fail-closed: if tracking is lost the whole frame is blurred rather than
 * leaking an unmasked face.
 */
export function drawFrame(o: DrawOptions) {
  const { ctx, video, width, height, faces, mask, images, failClosed } = o;
  ctx.clearRect(0, 0, width, height);

  if (failClosed) {
    ctx.save();
    ctx.filter = "blur(40px)";
    ctx.drawImage(video, 0, 0, width, height);
    ctx.restore();
    return;
  }

  ctx.drawImage(video, 0, 0, width, height);

  for (const lm of faces) {
    const oval = toPixels(lm, FACE_OVAL, width, height);
    const box = expand(boundingBox(oval), 0.18);

    if (mask === "blur") {
      ctx.save();
      tracePath(ctx, oval);
      ctx.clip();
      ctx.filter = "blur(32px)";
      ctx.drawImage(video, 0, 0, width, height);
      ctx.restore();
      // Solid core so blur cannot be sharpened back.
      ctx.save();
      tracePath(ctx, oval);
      ctx.fillStyle = "rgba(20,20,20,0.85)";
      ctx.fill();
      ctx.restore();
      continue;
    }

    const img = images[mask];
    if (img) {
      // Opaque base so the real face never shows through transparent mask pixels.
      ctx.save();
      tracePath(ctx, oval);
      ctx.fillStyle = "#0A0A0A";
      ctx.fill();
      ctx.restore();

      const roll = faceRoll(lm);
      ctx.save();
      ctx.translate(box.x + box.w / 2, box.y + box.h / 2);
      ctx.rotate(roll);
      ctx.drawImage(img, -box.w / 2, -box.h / 2, box.w, box.h);
      ctx.restore();
    } else {
      tracePath(ctx, oval);
      ctx.fillStyle = "#0A0A0A";
      ctx.fill();
    }
  }
}

function faceRoll(lm: Landmarks): number {
  // Outer eye corners: 33 (right eye outer), 263 (left eye outer).
  const a = lm[33];
  const b = lm[263];
  if (!a || !b) return 0;
  return Math.atan2(b.y - a.y, b.x - a.x);
}
