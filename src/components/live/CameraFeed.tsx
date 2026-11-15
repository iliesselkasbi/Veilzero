"use client";

import { forwardRef } from "react";

/**
 * The raw camera element. It is kept off-screen and never displayed: users only
 * ever see the processed canvas, so a bug in rendering cannot expose the raw feed.
 */
const CameraFeed = forwardRef<HTMLVideoElement>(function CameraFeed(_, ref) {
  return (
    <video
      ref={ref}
      playsInline
      muted
      aria-hidden
      className="pointer-events-none fixed -left-[9999px] top-0 h-px w-px opacity-0"
    />
  );
});

export default CameraFeed;
