# VEILZERO — Be seen. Not identified.

**Off-grid coordination for life in the Hollow.**

**Launch Live App:** **https://veilzero.vercel.app/**
> *(Runs in the browser over HTTPS; source media is not sent to an application server. Offline use requires the PWA shell and assets to have been cached.)*

VEILZERO is a browser-based privacy toolkit built to keep working when the uplink dies. It obscures your face, transforms your voice, scrubs identifying file metadata, and seals exports into offline **Resistance Drops**. Media is processed locally and is not uploaded by the app. No accounts are required.

---

## Core Modules

| Module | Route | What it does |
|---|---|---|
| **Witness Cam** | `/live` | Real-time webcam face masking (on-device MediaPipe) + native Web Audio pitch/timbre distortion. Includes a fail-closed killswitch if tracking slips. |
| **Evidence Scrub** | `/clean` | Strips identifying metadata (GPS, device, author, timestamps) while keeping safe structural tags (dimensions, bit depth). Includes local SHA-256 integrity hashing. |
| **Resistance Drop** | `/live` & `/clean` | Seals media into a self-contained, password-protected HTML file using **AES-256-GCM**. Opens offline and includes a **BURN VIEW** control to revoke the decrypted object URL and clear the displayed media. |
| **Blackout Mode** | Global | Production PWA + Service Worker caches the app shell and ML models so the toolkit runs completely offline. |
| **Global Burn & HUD** | Global | Best-effort network telemetry (`NETWORK STATUS: NO EXTERNAL REQUESTS OBSERVED`) and a navigation **BURN** action that revokes registered object URLs. Offline-cache removal is a separate, explicit action. |

---

## Quick Start

### Requirements
* **Node.js:** 20.9+ (20 LTS recommended)
* **Browser:** Modern Chromium-based browser (requires `localhost` or HTTPS for camera, mic, WASM, and WebCrypto)

### Installation
```bash
git clone https://github.com/iliesselkasbi/Veilzero.git
cd Veilzero
npm ci             # Runs postinstall to copy MediaPipe model files to public/mediapipe
```

### Development Mode
```bash
npm run dev
```
Open `http://localhost:3000`. *(Note: Service worker caching is disabled in dev mode to prevent conflicts with Hot Module Replacement.)*

### Judge / Blackout Demo Mode (Offline-Capable)
To test full offline capability and service worker caching, run the production build:
```bash
npm run demo

```
1. Open `http://localhost:3000` and visit `/`, `/live`, `/clean`, and `/about` once to seed the cache.
2. Open **DevTools → Application → Service Workers** and confirm the worker is **activated**.
3. Open **DevTools → Network**, set throttling to **Offline**, and hard-reload the page.
4. Test Witness Cam, Evidence Scrub, and Resistance Drops — the HUD reports requests it has observed; this is not a guarantee that no request can ever occur.

---

## Privacy Design and Limitations

* **Network boundary:** Fonts, scripts, and MediaPipe WASM/model files are self-hosted. The restrictive CSP `connect-src 'self'` is the primary network boundary; JavaScript request guards are defense-in-depth, not a guarantee. The HUD is a best-effort observation of browser performance entries and CSP violations, not a complete network monitor.
* **Raw Feed Never Exposed:** The raw camera `<video>` stays off-screen. Users and `MediaRecorder` only access the processed canvas and distorted audio stream.
* **Fail-Closed Killswitch:** If face tracking drops or the lens is covered (~120ms–500ms), the frame blacks out/blurs and recording locks until a face is re-acquired.
* **No Raw-Voice Path:** The Web Audio graph routes directly through the pitch/timbre chain. Muting silences output rather than bypassing processing.
* **Verified Metadata Purge:** Files are re-scanned after stripping to confirm residual identifying threats equal `0`, paired with before/after local **SHA-256** checksums.
* **Network observations:** The `/about` page presents best-effort browser performance observations and can miss requests. It does not verify the absence of all network traffic.
* **Hardened Headers:** `next.config.js` sets `Referrer-Policy: no-referrer` and a restrictive `Permissions-Policy`; the nonce-based CSP is set by Next's `proxy.ts`.
* **Encrypted drops:** stealth mode hides the filename and metadata until unlock. Payloads are encrypted in authenticated 1 MiB AES-GCM chunks; the visible header is authenticated as additional data. Keys use PBKDF2-SHA-256 with the iteration count stored in the payload. JavaScript memory clearing is best effort, not guaranteed zeroization.
* **Experimental face warp:** Ghost mode changes the face mesh geometrically, but is not validated against face-recognition systems. Use Void for full face redaction.

---

## Metadata Support (`/clean`)

| Format | Stripping Method |
|---|---|
| **JPEG** | Removes EXIF, XMP, IPTC, ICC, and comments (`APP1`–`APP15` except Adobe `APP14`, `COM`). Pixels remain unchanged except when EXIF orientation must be applied through re-encoding. |
| **PNG** | Keeps only image and animation structure (`IHDR`, `PLTE`, `IDAT`, `IEND`, `tRNS`, `acTL`, `fcTL`, `fdAT`). Other chunks, including C2PA, are discarded. |
| **WebP** | Keeps only image and animation structure (`VP8X`, `VP8 `, `VP8L`, `ALPH`, `ANIM`, `ANMF`). Other chunks, including C2PA, are discarded. |
| **Fallback** | If a supported image cannot be losslessly stripped, it is re-encoded through canvas; unsupported formats are refused. |
| **MP4 / MOV / M4A** | Neutralizes `udta`, `meta`, `XMP`, and `uuid` boxes and clears creation/modification timestamps in place. Metadata-handler tracks such as GoPro `gpmd` are detected and warned about, but their media payloads are not removed. |
| **PDF & Unsupported** | Detected and flagged, **not** stripped. Refused rather than falsely marked clean. |

*(Color-profile metadata is removed where present, which can shift displayed colors. JPEGs with EXIF orientation are re-encoded to apply the orientation before the tag is removed. If a format requires canvas re-encoding, the export warns about possible quality or format changes.)*

---

## Tech Stack & Repo Layout

* **Framework:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS
* **On-Device ML & Media:** MediaPipe Face Mesh (local WASM), Web Audio API, HTML5 Canvas
* **Cryptography & Parsing:** WebCrypto API (`AES-256-GCM`, `SHA-256`), `exifr`, custom binary byte-strippers
* **Offline PWA:** Custom Service Worker (`public/sw.js`) & Web Manifest

```text
public/
  mediapipe/          # Self-hosted FaceMesh JS, WASM, and model binaries
  sw.js               # Blackout mode service worker
src/
  app/                # Next.js routes (/, /live, /clean, /about)
  components/         # UI, Witness Cam (/live), Evidence Scrub (/clean), HUD
  hooks/              # MediaPipe, Web Audio, and metadata state hooks
  lib/                # Byte strippers, AES Resistance Drop builder, SHA-256, session burn
  config/             # Threat vs. structural metadata tag classifications
```

---

## Validation & Optional Assets

### Run CI Checks
```bash
npm run lint
npm test
npm run typecheck
npm run build
```
GitHub Actions automatically runs these checks on pushes and pull requests to `main`. See [CONTRIBUTING.md](CONTRIBUTING.md) and the [Project Wiki](docs/wiki/Home.md) for workflow details.

### Optional Custom Fonts & OG Image
Drop `Cinzel-Regular.woff2`, `Cinzel-Bold.woff2`, and `JetBrainsMono-Regular.woff2` into `public/fonts/` (the app falls back to system serif/mono fonts if omitted). Add `public/og-image.png` (`1200×630`) for social link previews.

---

## Known Limits
VEILZERO minimizes digital traces, but does not guarantee total anonymity:
* Physical traits (clothing, background, gait, speech patterns, writing style) can still identify you.
* Determined forensic audio analysis may partially reverse pitch/timbre distortion.
* Voice pitch/formant changes are reversible to a degree; do not treat them as reliable voice anonymization.
* Embedded video streams may retain low-level encoder metadata tags or metadata-handler tracks.
* Large media and Resistance Drops are held in browser memory during processing; large files can exhaust device memory.
* "Coordination layer" refers to local preparation and offline file handoffs, not a live peer-to-peer mesh network.
* The checked-in metadata fixtures are synthetic parser tests, not independently recorded evidence. Face recognition resistance has not been benchmarked; the optional benchmark requires a consented, representative image set. Browser smoke tests use a fake camera and do not validate physical camera hardware or recognition outcomes.
* WebM cleanup clears selected muxing strings and the `DateUTC` field without re-muxing; other container metadata may remain.

## Third-Party Attribution
* **MediaPipe Face Mesh:** Licensed under Apache License 2.0 (Google). Attribution is preserved in `public/mediapipe/`.
