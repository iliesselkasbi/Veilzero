# VEILZERO — Be seen. Not identified.

**Off-grid coordination for life in the Hollow.**

VEILZERO is a 100% client-side anti-surveillance toolkit built to keep working when the uplink dies. Cloaks your face, distorts your voice, scrubs identifying file metadata, and seals exports into offline **Resistance Drops**. Nothing uploads. No accounts. Zero external requests.

---

## Core Modules

| Module | Route | What it does |
|---|---|---|
| **Witness Cam** | `/live` | Real-time webcam face masking (on-device MediaPipe) + native Web Audio pitch/timbre distortion. Includes a fail-closed killswitch if tracking slips. |
| **Evidence Scrub** | `/clean` | Strips identifying metadata (GPS, device, author, timestamps) while keeping safe structural tags (dimensions, bit depth). Includes local SHA-256 integrity hashing. |
| **Resistance Drop** | `/live` & `/clean` | Seals media into a self-contained, password-protected HTML file using **AES-256-GCM**. Opens offline and features a one-click **Burn View** wipe. |
| **Blackout Mode** | Global | Production PWA + Service Worker caches the app shell and ML models so the toolkit runs completely offline. |
| **Global Burn & HUD** | Global | Live corner telemetry (`OFF-GRID ACTIVE | 0 EXT REQ`) and a navigation **BURN** button that wipes session state and revokes object URLs. |

---

## Quick Start

### Requirements
* **Node.js:** 18+ (20 recommended)
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
4. Test Witness Cam, Evidence Scrub, and Resistance Drops — the app continues working with **`0 EXT REQ`** on the HUD.

---

## How the Privacy Guarantees Are Built

* **Zero External Requests:** All fonts, scripts, and MediaPipe WASM/model files are self-hosted in `/public/mediapipe`. No CDNs, telemetry, or cloud APIs exist.
* **Live Zero-Trust HUD:** Real-time network monitoring (`● ZERO-TRUST SECURE | 0 EXT REQ`) that shifts to the critical alert state (`CRITICAL: NETWORK BREACH DETECTED | 1 EXT REQ`) upon clicking `[ INJECT TEST PACKET ]`.
* **Raw Feed Never Exposed:** The raw camera `<video>` stays off-screen. Users and `MediaRecorder` only access the processed canvas and distorted audio stream.
* **Fail-Closed Killswitch:** If face tracking drops or the lens is covered (~120ms–500ms), the frame blacks out/blurs and recording locks until a face is re-acquired.
* **No Raw-Voice Path:** The Web Audio graph routes directly through the pitch/timbre chain. Muting silences output rather than bypassing processing.
* **Verified Metadata Purge:** Files are re-scanned after stripping to confirm residual identifying threats equal `0`, paired with before/after local **SHA-256** checksums.
* **Live Auditability:** The `/about` page monitors the browser `Performance API` in real time to verify `0` off-origin requests and `0` beacons.
* **Hardened Headers:** `next.config.js` enforces `Referrer-Policy: no-referrer` and a strict `Permissions-Policy`.

---

## Metadata Support (`/clean`)

| Format | Stripping Method |
|---|---|
| **JPEG** | Removes EXIF, XMP, IPTC, ICC, and comments (`APP1`–`APP15` except Adobe `APP14`, `COM`). Pixels remain untouched. |
| **PNG** | Removes `tEXt`, `zTXt`, `iTXt`, `eXIf`, `tIME`, and `iCCP` chunks. Pixels remain untouched. |
| **WebP** | Removes `EXIF`, `XMP`, and `ICCP` chunks. |
| **Other Images** | Re-encoded through an HTML5 canvas pass to drop all embedded metadata. |
| **MP4 / MOV / M4A** | Neutralizes `udta`, `meta`, `XMP`, and `uuid` boxes in place while preserving file size and offsets. |
| **PDF & Unsupported** | Detected and flagged, **not** stripped. Refused rather than falsely marked clean. |

*(Note: Stripping EXIF also removes orientation tags, so certain mobile photos may display rotated.)*

---

## Tech Stack & Repo Layout

* **Framework:** Next.js 14 (App Router), React, TypeScript, Tailwind CSS
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
* Embedded video streams may retain low-level encoder metadata tags.
* "Coordination layer" refers to local preparation and offline file handoffs, not a live peer-to-peer mesh network.

## Third-Party Attribution
* **MediaPipe Face Mesh:** Licensed under Apache License 2.0 (Google). Attribution is preserved in `public/mediapipe/`.
