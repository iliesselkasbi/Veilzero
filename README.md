# VEILZERO — Be seen. Not identified.

Browser-based anti-surveillance toolkit. Cloaks your face, distorts your voice and strips file metadata. Everything runs client-side. Nothing hits a server.

| Mode | What it does |
|---|---|
| **VEILZERO LIVE** (`/live`) | Webcam + mic → real-time face mask + voice distortion → record + export |
| **VEILZERO CLEAN** (`/clean`) | Drop a file → strip metadata → verify → export clean copy |

## Run

```bash
npm ci             # postinstall copies MediaPipe model files to public/mediapipe
npm run dev
```

Open http://localhost:3000. Camera and mic need `localhost` or HTTPS.

## Validate changes

```bash
npm run lint
npm run typecheck
npm run build
```

GitHub Actions runs these checks for pushes to `main` and pull requests targeting
`main`. See [Contributing](CONTRIBUTING.md) and the [project wiki](docs/wiki/Home.md)
for the development workflow and project guidance.

### Fonts

Drop these into `public/fonts/` (the app falls back to system serif/mono without them):
`Cinzel-Regular.woff2`, `Cinzel-Bold.woff2`, `JetBrainsMono-Regular.woff2` (all OFL-licensed, from Google Fonts).
Add `public/og-image.png` (1200×630) for link previews.

## How the privacy guarantees are built

- **Raw feed is never shown or recorded.** The camera `<video>` is off-screen. Users see, and `MediaRecorder` captures, only the processed canvas and processed audio.
- **Fail-closed face tracking.** If no face is tracked for 500 ms the whole frame is blurred, and recording is disabled until a face is cloaked again.
- **No raw-voice path.** The audio graph has no route from mic to output that skips processing. "Mute" silences the output rather than bypassing it.
- **Self-hosted ML.** MediaPipe assets are served from `/public/mediapipe`, not a CDN.
- **Verified cleaning.** After stripping, the output file is re-scanned and the "traces remaining" count is the real result.
- **Verify it yourself.** The About page shows live request counts from the Performance API; DevTools → Network gives an independent check.
- `Referrer-Policy: no-referrer` and a restrictive `Permissions-Policy` are set in `next.config.js`.

## Metadata support (Clean mode)

| Format | Method |
|---|---|
| JPEG | Removes EXIF, XMP, IPTC, ICC, comments (APP1–APP15 except Adobe APP14, COM). Pixels untouched. |
| PNG | Removes tEXt/zTXt/iTXt/eXIf/tIME chunks. Pixels untouched. |
| WebP | Removes EXIF, XMP, ICCP chunks. |
| Other images | Re-encoded through canvas (drops everything, slight re-compression). |
| MP4 / MOV / M4A | Neutralises `udta`, `meta`, XMP and `uuid` boxes in place; size and offsets preserved. |
| PDF and others | Detected and reported, **not** stripped. Unsupported files are refused rather than falsely marked clean. |

Note: removing EXIF also removes the orientation tag, so some phone photos may display rotated.

## Limits

VEILZERO reduces identifying signals; it does not guarantee anonymity. Background, clothing, speech content and writing style can still identify you, and voice distortion can be partially reversed by determined analysis. Embedded video streams may also carry encoder tags that are not removed.
